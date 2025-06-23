from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from neo4j import GraphDatabase
import os
import json
import time
import sys
from dotenv import load_dotenv
import logging
import traceback
import uuid
from mem0 import Memory  # Added Mem0 import

# Configure detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Conversation store to maintain context between queries
# Structure: { session_id: [{"question": "...", "answer": "..."}, ...] }
conversation_store = {}

# Conversation expiry (in seconds) - optional cleanup mechanism
CONVERSATION_EXPIRY = 3600  # 1 hour
last_activity = {}  # Tracks when sessions were last used

# Diagnostic logging for credentials and environment
creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
location = os.environ.get("GOOGLE_CLOUD_LOCATION")
GEMINI_API_KEY = 'AIzaSyABYxF7NFn_xNrV99yA2RDR4Ss0PBUMQ8I'

logger.info(f"GOOGLE_APPLICATION_CREDENTIALS path: {creds_path}")
logger.info(f"Credentials file exists: {os.path.exists(creds_path) if creds_path else False}")
logger.info(f"GOOGLE_CLOUD_PROJECT: {project_id}")
logger.info(f"GOOGLE_CLOUD_LOCATION: {location}")

# Verify if quotes are present in environment variables and remove them
if location and (location.startswith('"') or location.startswith("'")):
    location = location.strip('"\'')
    logger.warning(f"Removed quotes from GOOGLE_CLOUD_LOCATION: now {location}")
    os.environ["GOOGLE_CLOUD_LOCATION"] = location

# For Gemini integration - using an approach that works with your package version
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
    logger.info("Successfully imported google.generativeai package")
except ImportError as e:
    GEMINI_AVAILABLE = False
    logger.error(f"Failed to import google generative AI: {e}")
    print(f"Warning: Google Generative AI packages not available: {e}")

app = FastAPI(title="Knowledge Graph API")

# CRITICAL FIX: Add middleware to handle large response sizes
@app.middleware("http")
async def increase_response_size(request: Request, call_next):
    response = await call_next(request)
    
    # Log response size
    if hasattr(response, "body"):
        try:
            body_size = len(response.body)
            logger.info(f"HTTP Response size: {body_size} bytes")
            
            # If response is large, log additional details
            if body_size > 10000:
                logger.info(f"Large response detected ({body_size} bytes). Response starts with: {str(response.body[:200])}...")
                
        except Exception as e:
            logger.warning(f"Could not log response size: {e}")
    
    return response

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cd-frontend-app-866853235757.europe-west3.run.app",  # Production frontend
        "http://localhost:3000",  # Development frontend
        "*"  # Allow all origins (remove in production for better security)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Neo4j connection
neo4j_uri = "bolt://34.107.71.106:7687" #os.getenv("NEO4J_URI")
neo4j_user = "neo4j" #os.getenv("NEO4J_USERNAME")
neo4j_password = "CtC73MKi9CMku0tRe-nTUUD2J9Dms1-8gbI1FHjNBr0" #os.getenv("NEO4J_PASSWORD")

if not all([neo4j_uri, neo4j_user, neo4j_password]):
    logger.error("Neo4j connection details missing from environment variables")
    raise ValueError("Neo4j connection details missing from environment variables")

driver = None

try:
    driver = GraphDatabase.driver(
        neo4j_uri,
        auth=(neo4j_user, neo4j_password)
    )
    # Test connection
    with driver.session() as session:
        session.run("RETURN 1")
    logger.info("Neo4j connection established successfully")
except Exception as e:
    logger.error(f"Failed to connect to Neo4j: {e}")
    raise

# Initialize Mem0 with Neo4j connection and Gemini embeddings
try:
    # Configure with Neo4j graph store and Gemini embedder
    os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY  # Ensure GEMINI_API_KEY is available for Mem0
    
    mem0_config = {
        "graph_store": {
            "provider": "neo4j",
            "config": {
                "url": neo4j_uri,
                "username": neo4j_user,
                "password": neo4j_password,
            },
        },
        # Add Gemini embedder configuration
        "embedder": {
            "provider": "gemini",
            "config": {
                "model": "gemini-embedding-exp-03-07"  # Specified Gemini embedding model
            }
        }
    }
    logger.info("Initializing Mem0 with Neo4j and Gemini embeddings...")
    mem0 = Memory.from_config(config_dict=mem0_config)
    logger.info("✅ Successfully initialized Mem0 with Neo4j and Gemini embeddings")
except Exception as e:
    # Fallback to basic initialization with Gemini embeddings if the Neo4j one fails
    logger.error(f"Failed to initialize Mem0 with Neo4j graph store: {e}")
    logger.info("Falling back to basic Mem0 initialization with Gemini embeddings only...")
    try:
        # Create a basic config with just Gemini embeddings
        fallback_config = {
            "embedder": {
                "provider": "gemini",
                "config": {
                    "model": "gemini-embedding-exp-03-07"  # Specified Gemini embedding model
                }
            }
        }
        mem0 = Memory.from_config(config_dict=fallback_config)
        logger.info("✅ Successfully initialized Mem0 with Gemini embeddings only")
    except Exception as fallback_e:
        logger.error(f"Failed to initialize Mem0 with Gemini embeddings: {fallback_e}")
        logger.error(traceback.format_exc())
        mem0 = None

# Initialize Gemini - use the GenerativeModel API style that works with your package
gemini_available = False
if GEMINI_AVAILABLE:
    try:
        logger.info("Setting up Gemini with GenerativeModel API...")
        
        # Configure with API key=None to use application default credentials
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Test the model
        try:
            model = genai.GenerativeModel("gemini-2.5-flash-preview-04-17")
            test_response = model.generate_content("Hello, this is a test")
            logger.info(f"✅ Gemini test successful: {test_response.text[:30]}...")
            gemini_available = True  # Flag to indicate Gemini is working
        except Exception as test_e:
            logger.error(f"Gemini model test failed: {test_e}")
            logger.error(traceback.format_exc())
            gemini_available = False
    except Exception as e:
        logger.error(f"Failed to configure Gemini: {e}")
        logger.error(traceback.format_exc())
        gemini_available = False

# Define request models
class Query(BaseModel):
    query: str
    max_results: Optional[int] = 10
    threshold: Optional[float] = 0.3
    session_id: Optional[str] = None  # Add session_id parameter

class GraphSearchResponse(BaseModel):
    answer: str
    context: Optional[List[Dict[str, Any]]] = None
    query_details: Optional[Dict[str, Any]] = None

# Mem0 request models
class MemoryAddRequest(BaseModel):
    text: str
    userId: str

class MemorySearchRequest(BaseModel):
    query: str
    userId: str

@app.get("/")
async def root():
    # Include diagnostic info in the response
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    return {
        "status": "online", 
        "service": "Knowledge Graph API",
        "gemini_status": {
            "imports_available": GEMINI_AVAILABLE,
            "model_api_working": gemini_available,
            "credentials_path": f"{creds_path[:10]}..." if creds_path else "Not set",
            "credentials_exist": os.path.exists(creds_path) if creds_path else False,
            "project_id": project_id,
            "location": location,
        },
        "mem0_status": {
            "initialized": mem0 is not None
        }
    }

@app.post("/memory/add")
async def add_memory(request: MemoryAddRequest):
    """Add a memory to the graph store"""
    try:
        if not mem0:
            raise HTTPException(status_code=500, detail="Mem0 is not initialized")
        
        logger.info(f"Adding memory for user {request.userId}: {request.text[:50]}...")
        mem0.add(request.text, user_id=request.userId)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error adding memory: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/memory/search")
async def search_memory(request: MemorySearchRequest):
    """Search memories in the graph store"""
    try:
        if not mem0:
            raise HTTPException(status_code=500, detail="Mem0 is not initialized")
        
        logger.info(f"Searching memories for user {request.userId}: {request.query}")
        results = mem0.search(request.query, user_id=request.userId)
        logger.info(f"Found memories: {len(results) if results else 0} characters")
        return {"results": results}
    except Exception as e:
        logger.error(f"Error searching memories: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/memory/all/{user_id}")
async def get_all_memories(user_id: str):
    """Get all memories for a user"""
    try:
        if not mem0:
            raise HTTPException(status_code=500, detail="Mem0 is not initialized")
        
        logger.info(f"Getting all memories for user {user_id}")
        memories = mem0.get_all(user_id=user_id)
        logger.info(f"Retrieved memories: {len(memories) if memories else 0}")
        return {"memories": memories}
    except Exception as e:
        logger.error(f"Error getting memories: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/memory/all/{user_id}")
async def delete_all_memories(user_id: str):
    """Delete all memories for a user"""
    try:
        if not mem0:
            raise HTTPException(status_code=500, detail="Mem0 is not initialized")
        
        logger.info(f"Deleting all memories for user {user_id}")
        mem0.delete_all(user_id=user_id)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting memories: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-gemini")
async def test_gemini():
    """
    Test endpoint to verify Gemini is working properly
    """
    if not GEMINI_AVAILABLE:
        return {"status": "error", "message": "Gemini API imports not available"}
    
    if not gemini_available:
        return {"status": "error", "message": "Gemini API imports available but model initialization failed"}
    
    try:
        # Use the model with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Testing with gemini-2.5-flash-preview-04-17 (attempt {attempt+1})")
                
                # Create model with generation config
                model = genai.GenerativeModel("gemini-2.5-flash-preview-04-17", 
                                             generation_config={
                                                 "temperature": 0.2,
                                                 "top_p": 0.95,
                                                 "top_k": 40,
                                                 "max_output_tokens": 4096,
                                             })
                
                # Generate content
                response = model.generate_content("What is ISO 14001?")
                response_text = response.text
                
                # Log response details
                logger.info(f"Response length: {len(response_text)}")
                logger.info(f"First 100 chars: {response_text[:100]}")
                
                # Create a debug file with the complete response
                # debug_filename = f"debug_test_response_{uuid.uuid4()}.txt"
                # with open(debug_filename, "w") as f:
                #     f.write(response_text)
                # logger.info(f"Saved test response to {debug_filename}")
                
                return {
                    "status": "success", 
                    "response": response_text, 
                    "response_length": len(response_text),
                    "model": "gemini-2.5-flash-preview-04-17"
                    # "debug_file": debug_filename
                }
            except Exception as retry_e:
                if attempt < max_retries - 1:
                    logger.warning(f"Gemini API error (attempt {attempt+1}): {retry_e}")
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise
    except Exception as e:
        logger.error(f"Test endpoint error: {e}")
        logger.error(traceback.format_exc())
        return {
            "status": "error", 
            "message": str(e), 
            "traceback": traceback.format_exc()
        }

@app.post("/proxy-gemini")
async def proxy_gemini(request: Request):
    """
    Proxy requests to Gemini API through backend (using backend auth)
    """
    try:
        # Get request body
        body = await request.json()
        prompt = body.get("prompt")
        files = body.get("files", [])
        
        if not prompt:
            raise HTTPException(status_code=400, detail="Missing prompt parameter")
        
        if not GEMINI_AVAILABLE:
            logger.error("Gemini API imports not available for proxy request")
            return {
                "status": "error", 
                "message": "Gemini integration is not available. Please configure Google Generative AI packages."
            }
        
        if not gemini_available:
            logger.error("Gemini API imports available but model initialization failed")
            return {
                "status": "error", 
                "message": "Gemini integration is not available. Model initialization failed."
            }
        
        # Use the model with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Proxying request to gemini-2.5-flash-preview-04-17 (attempt {attempt+1}). Prompt length: {len(prompt)}")
                
                # Create model with generation config
                model = genai.GenerativeModel("gemini-2.5-flash-preview-04-17", 
                                             generation_config={
                                                 "temperature": 0.2,
                                                 "top_k": 40,
                                                 "top_p": 0.95,
                                                 "max_output_tokens": 4096,
                                             })
                
                # Generate content
                response = model.generate_content(prompt)
                full_text = response.text
                
                # Get the full text and log its length
                logger.info(f"Complete response length from Gemini: {len(full_text)}")
                logger.info(f"First 100 chars: {full_text[:100]}...")
                logger.info(f"Last 100 chars: {full_text[-100:] if len(full_text) > 100 else full_text}")
                
                # Write debug file
                # debug_filename = f"debug_proxy_response_{uuid.uuid4()}.txt"
                # with open(debug_filename, "w") as f:
                #     f.write(full_text)
                # logger.info(f"Saved proxy response to {debug_filename}")
                
                # Return the result with full response text
                return {"status": "success", "text": full_text}
            except Exception as retry_e:
                if attempt < max_retries - 1:
                    logger.warning(f"Gemini API error (attempt {attempt+1}): {retry_e}")
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise
    except Exception as e:
        logger.error(f"Error proxying to Gemini: {e}")
        logger.error(traceback.format_exc())
        return {"status": "error", "message": str(e)}

@app.post("/ask", response_model=GraphSearchResponse)
async def ask_knowledge_graph(query: Query):
    """
    Query the knowledge graph and get an AI-enhanced response with conversation context
    """
    try:
        # Handle session ID - create a new one if not provided
        if not query.session_id:
            query.session_id = str(uuid.uuid4())
            logger.info(f"Created new conversation session: {query.session_id}")
        
        # Get or create conversation history
        conversation = conversation_store.get(query.session_id, [])
        
        # Update last activity time
        last_activity[query.session_id] = time.time()
        
        # Clean up old conversations (optional)
        current_time = time.time()
        expired_sessions = [sid for sid, last_time in last_activity.items() 
                          if current_time - last_time > CONVERSATION_EXPIRY]
        for sid in expired_sessions:
            if sid in conversation_store:
                del conversation_store[sid]
            del last_activity[sid]
            logger.info(f"Cleaned up expired session: {sid}")
        
        # Extract key terms from the query for better search
        query_text = query.query.lower()
        logger.info(f"Processing query in session {query.session_id}: '{query_text}'")
        
        # Search the knowledge graph using fulltext index
        with driver.session() as session:
            # Try fulltext search if available 
            nodes = []
            relationships = []
            
            try:
                # Check if fulltext index exists
                check_index_query = """
                CALL db.indexes() YIELD name, type
                WHERE type = 'FULLTEXT' AND name = 'entities'
                RETURN count(*) as indexCount
                """
                index_result = session.run(check_index_query)
                has_index = index_result.single()["indexCount"] > 0
                
                if has_index:
                    fulltext_query = """
                    CALL db.index.fulltext.queryNodes($index_name, $query_text) YIELD node, score
                    WHERE score > $threshold
                    RETURN 
                        node, 
                        labels(node) as labels, 
                        score
                    ORDER BY score DESC
                    LIMIT $limit
                    """
                    
                    fulltext_result = session.run(
                        fulltext_query, 
                        index_name="entities",  # Use your fulltext index name
                        query_text=query.query,
                        threshold=query.threshold,
                        limit=query.max_results
                    )
                    
                    # Convert results to a list of dictionaries
                    for record in fulltext_result:
                        node = record["node"]
                        node_data = dict(node.items())
                        node_data["labels"] = record["labels"]
                        node_data["score"] = record["score"]
                        nodes.append(node_data)
                    
                    logger.info(f"Fulltext search found {len(nodes)} results")
                else:
                    logger.warning("No fulltext index named 'entities' was found")
                
            except Exception as e:
                logger.warning(f"Error in fulltext search: {e}. Falling back to keyword search")
            
            # If no results from fulltext, try enhanced keyword search
            if not nodes:
                logger.info("Trying enhanced keyword search")
                
                # Get search terms - extract key words and phrases from the query
                words = query_text.split()
                key_terms = []
                
                # Add full query
                key_terms.append(query_text)
                
                # Add individual significant words (length > 3)
                key_terms.extend([word for word in words if len(word) > 3])
                
                # Add common compliance terms if they appear in the query
                compliance_terms = ["iso", "standard", "regulation", "compliance", "requirement", 
                                    "directive", "law", "policy", "certification", "audit", "assessment",
                                    "cooling", "efficiency", "energy", "sustainability", "environment", 
                                    "taxonomy", "documentation", "esg", "carbon", "emissions", "waste"]
                
                for term in compliance_terms:
                    if term in query_text:
                        key_terms.append(term)
                
                # Remove duplicates
                key_terms = list(set(key_terms))
                
                logger.info(f"Search terms: {key_terms}")
                
                # Build dynamic query parts for each term
                term_conditions = []
                for term in key_terms:
                    term_condition = f"""(
                        toLower(toString(n.title)) CONTAINS '{term}' OR
                        toLower(toString(n.name)) CONTAINS '{term}' OR
                        toLower(toString(n.description)) CONTAINS '{term}' OR
                        toLower(toString(n.content)) CONTAINS '{term}'
                    )"""
                    term_conditions.append(term_condition)
                
                # Join with OR
                combined_condition = " OR ".join(term_conditions)
                
                # Enhanced property matching
                keyword_query = f"""
                MATCH (n)
                WHERE {combined_condition}
                RETURN n, labels(n) as labels
                LIMIT $limit
                """
                
                # Try with enhanced search
                keyword_result = session.run(
                    keyword_query, 
                    limit=query.max_results
                )
                
                # Convert results
                for record in keyword_result:
                    node = record["n"]
                    node_data = dict(node.items())
                    node_data["labels"] = record["labels"]
                    node_data["score"] = 0.5  # Default score
                    nodes.append(node_data)
                
                logger.info(f"Enhanced keyword search found {len(nodes)} results")
                
                # If still no results, try a broader search
                if not nodes:
                    logger.info("Trying broader search")
                    
                    # Identify document types that might be relevant
                    doc_types = []
                    if "cooling" in query_text or "data center" in query_text:
                        doc_types.extend(["EnergySaving", "Standard", "ISO"])
                    if "compliance" in query_text:
                        doc_types.extend(["Compliance", "Standard", "Regulation"])
                    if "environment" in query_text or "sustainability" in query_text:
                        doc_types.extend(["Environment", "ESG", "Standard"])
                    
                    # If we have document types, search by labels
                    if doc_types:
                        doc_types_condition = " OR ".join([f"'{doc_type}' IN labels(n)" for doc_type in doc_types])
                        
                        broader_query = f"""
                        MATCH (n)
                        WHERE {doc_types_condition}
                        RETURN n, labels(n) as labels
                        LIMIT $limit
                        """
                        
                        broader_result = session.run(
                            broader_query, 
                            limit=query.max_results
                        )
                        
                        # Convert results
                        for record in broader_result:
                            node = record["n"]
                            node_data = dict(node.items())
                            node_data["labels"] = record["labels"]
                            node_data["score"] = 0.3  # Lower default score for broader matches
                            nodes.append(node_data)
                        
                        logger.info(f"Broader search found {len(nodes)} results")
            
            # If we found results, get relationships for context
            if nodes and len(nodes) > 0:
                try:
                    # Get IDs for top nodes
                    top_node_ids = [node.get("id") for node in nodes[:3] if "id" in node]
                    
                    if top_node_ids:
                        # Improved relationship query to handle missing properties
                        rel_query = """
                        MATCH (n)-[r]-(m)
                        WHERE n.id IN $node_ids
                        RETURN 
                            n.id as source_id,
                            type(r) as relationship,
                            m.id as target_id,
                            COALESCE(m.name, m.title, "") as target_name,
                            labels(m) as target_labels
                        LIMIT 20
                        """
                        
                        rel_result = session.run(rel_query, node_ids=top_node_ids)
                        
                        for record in rel_result:
                            rel_data = {
                                "source_id": record["source_id"],
                                "relationship": record["relationship"],
                                "target_id": record["target_id"],
                                "target_name": record["target_name"],
                                "target_labels": record["target_labels"]
                            }
                            relationships.append(rel_data)
                        
                        logger.info(f"Found {len(relationships)} relationships")
                except Exception as rel_error:
                    logger.warning(f"Error fetching relationships: {rel_error}")
        
        # Log more detailed info about what was found
        if nodes:
            logger.info(f"Found nodes with titles: {[node.get('title') or node.get('name') or 'Untitled' for node in nodes[:5]]}")
            entity_types = set()
            for node in nodes:
                if node.get('labels'):
                    entity_types.update(node.get('labels'))
            logger.info(f"Entity types found: {entity_types}")
        
        # Format the knowledge graph results for the LLM - improved formatting
        has_kg_data = bool(nodes)
        if not has_kg_data:
            formatted_context = "No relevant information found in the knowledge graph."
        else:
            formatted_context = "Knowledge Graph Information:\n\n"
            
            # Format entities with more complete information
            for i, node in enumerate(nodes[:5]):
                node_type = node.get("labels", ["Entity"])[0] if node.get("labels") else "Entity"
                title = node.get("name") or node.get("title") or "Untitled"
                
                # Use a better source name
                source_name = title if title != "Untitled" else node_type
                
                formatted_context += f"ENTITY {i+1}: {node_type} - {title}\n"
                
                # Include all text content with minimal truncation
                for prop in ["description", "content", "definition", "code"]:
                    if prop in node and node.get(prop):
                        prop_value = str(node.get(prop))
                        # Use longer snippets for better context - NO TRUNCATION
                        formatted_context += f"  • {prop.capitalize()}: {prop_value}\n" 
                        # Don't add source here - Gemini will add it in the final answer
                        
                # Show all properties that might contain valuable information
                for prop, value in node.items():
                    if prop not in ["description", "content", "definition", "code", "id", "labels", "score"] and value:
                        formatted_context += f"  • {prop.capitalize()}: {value}\n"
                        
                # Show all relationships more prominently
                node_relationships = [r for r in relationships if r["source_id"] == node.get("id")]
                if node_relationships:
                    rel_by_type = {}
                    for rel in node_relationships:
                        rel_type = rel["relationship"]
                        if rel_type not in rel_by_type:
                            rel_by_type[rel_type] = []
                        target_name = rel["target_name"]
                        if target_name and target_name not in rel_by_type[rel_type]:
                            rel_by_type[rel_type].append(target_name)
                    
                    formatted_context += "  • Relationships:\n"
                    for rel_type, targets in rel_by_type.items():
                        targets_str = ", ".join(filter(None, targets))
                        if targets_str:
                            formatted_context += f"    - {rel_type}: {targets_str}\n"
                
                formatted_context += "\n"
        
        # Add debugging info to the answer if debugging is enabled
        debug_info = ""
        if os.getenv("DEBUG_KG", "").lower() == "true":
            debug_info = "\n\n---DEBUG INFO---\n"
            debug_info += f"Found {len(nodes)} total nodes in KG query\n"
            debug_info += f"Node titles: {[node.get('title') or node.get('name') or 'Untitled' for node in nodes[:5]]}\n"
            if nodes:
                entity_types = set()
                for node in nodes:
                    if node.get('labels'):
                        entity_types.update(node.get('labels'))
                debug_info += f"Entity types: {entity_types}\n"
            
            # Sample the formatted context to show what's being sent to Gemini
            if formatted_context and len(formatted_context) > 100:
                sample = formatted_context[:500] + "..." if len(formatted_context) > 500 else formatted_context
                debug_info += f"\nSample of context sent to Gemini:\n{sample}\n"
        
        # Build conversation history for the prompt
        conversation_history = ""
        if conversation:
            conversation_history = "Previous conversation:\n\n"
            for i, qa_pair in enumerate(conversation):
                conversation_history += f"Q{i+1}: {qa_pair['question']}\n"
                conversation_history += f"A{i+1}: {qa_pair['answer']}\n\n"
            logger.info(f"Including {len(conversation)} previous Q&A pairs in prompt")
        
        # Log context details
        logger.info(f"Sending to Gemini with context length: {len(formatted_context)} chars")
        
        # Prepare fallback answer in case Gemini fails
        fallback_answer = f"Gemini integration is not available. Please configure Google Generative AI properly.\n\n"
        if has_kg_data:
            fallback_answer += "However, I found these relevant items in the Knowledge Graph:\n\n"
            for i, node in enumerate(nodes[:5]):  # Show more results
                title = node.get("name") or node.get("title") or "Untitled"
                content = node.get("content") or node.get("description") or ""
                # Do not truncate content in fallback
                fallback_answer += f"{i+1}. {title}: {content}\n\n"
        
        # Generate answer using Gemini with multiple retries
        if GEMINI_AVAILABLE and gemini_available:
            try:
                # Create model with retry logic
                max_retries = 3
                answer = fallback_answer  # Default to fallback
                
                for attempt in range(max_retries):
                    try:
                        logger.info(f"Using gemini-2.5-flash-preview-04-17 model (attempt {attempt+1})")
                        
                        # Improved prompt with better instructions and conversation history
                        prompt_text = f"""
                        You are a compliance assistant. Do not address the user as "Val" in your responses.

                        {conversation_history}
                        Current User Question: {query.query}

                        {formatted_context}

                        Instructions:
                        1. CAREFULLY REVIEW the knowledge graph content above. It contains valuable information about compliance standards, documents, and requirements.
                        2. When using information from the knowledge graph, cite the specific source as follows:
                           - For standards like EN 50600 or ISO/IEC 30134-2, use: (Source: EN 50600) or (Source: ISO/IEC 30134-2)
                           - For other entities, use their type: (Source: Standard) or (Source: Regulation)
                           - DO NOT use "Message - Untitled" or HTML tags in your citations
                        3. Only say "The Knowledge Graph doesn't contain specific information about this topic" if there is ABSOLUTELY NO related information.
                        4. Look for indirect or partial matches - check for related standards and technical specifications.
                        5. Even if the information seems only loosely related, use it to provide context and supplement with your general knowledge.
                        6. Use bullet points for clarity where appropriate
                        7. Maintain a professional tone
                        8. Be concise but thorough
                        9. IMPORTANT: If the current question seems to be referring to previous questions or answers, use the conversation history to understand the context.

                        Answer:
                        """
                        
                        # Create model with generation config
                        model = genai.GenerativeModel("gemini-2.5-flash-preview-04-17", 
                                                     generation_config={
                                                         "temperature": 0.2,
                                                         "top_k": 40,
                                                         "top_p": 0.95,
                                                         "max_output_tokens": 4096,
                                                     })
                        
                        # Generate content
                        response = model.generate_content(prompt_text)
                        full_response_text = response.text
                        
                        # Log and check response length 
                        logger.info(f"Raw Gemini response length: {len(full_response_text)}")
                        logger.info(f"First 100 chars: {full_response_text[:100]}...")
                        logger.info(f"Last 100 chars: {full_response_text[-100:] if len(full_response_text) > 100 else full_response_text}")
                        
                        # Create a debug file with the complete response
                        # debug_filename = f"debug_kg_response_{uuid.uuid4()}.txt"
                        # with open(debug_filename, "w") as f:
                        #     f.write(full_response_text)
                        # logger.info(f"Saved KG response to {debug_filename}")
                        
                        # Ensure we're getting the full text
                        answer = full_response_text
                        
                        # Add debug info if enabled
                        if debug_info:
                            answer += debug_info
                        
                        logger.info(f"Successfully generated response with gemini-2.5-flash-preview-04-17")
                        logger.info(f"Final answer length: {len(answer)}")
                        break  # Success, exit retry loop
                        
                    except Exception as retry_e:
                        if attempt < max_retries - 1:
                            logger.warning(f"Gemini API error (attempt {attempt+1}): {retry_e}")
                            time.sleep(2 ** attempt)  # Exponential backoff
                        else:
                            logger.error(f"All Gemini API attempts failed: {retry_e}")
                            logger.info("Using fallback answer")
                            answer = fallback_answer
                
            except Exception as e:
                logger.error(f"Error generating with Gemini: {e}")
                logger.error(traceback.format_exc())
                answer = fallback_answer
        else:
            # Fallback if Gemini is not configured
            answer = fallback_answer
        
        # Store the Q&A pair in conversation history
        conversation.append({
            "question": query.query,
            "answer": answer
        })
        conversation_store[query.session_id] = conversation
        
        # Final check - log the response length
        logger.info(f"FINAL RESPONSE LENGTH: {len(answer)}")
        
        # Create a final debug file with the complete answer
        # final_debug_filename = f"final_answer_{uuid.uuid4()}.txt"
        # with open(final_debug_filename, "w") as f:
        #     f.write(answer)
        # logger.info(f"Saved final answer to {final_debug_filename}")
        
        # Return the result with complete answer and session_id
        result = GraphSearchResponse(
            answer=answer,
            context=nodes[:5] if nodes else None,
            query_details={
                "total_results": len(nodes),
                "relationships_found": len(relationships),
                "session_id": query.session_id  # Include session_id in response
            }
        )
        
        # Log the size of the JSON response
        result_json = result.json()
        logger.info(f"JSON Response size: {len(result_json)} bytes")
        
        return result
    
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.get("/explore")
async def explore_graph(keyword: Optional[str] = None, limit: int = 20):
    """
    Explore the knowledge graph structure or search for specific entities
    """
    try:
        with driver.session() as session:
            # Get entity types
            entity_query = """
            MATCH (n)
            WHERE $keyword IS NULL OR 
                  toLower(toString(n.name)) CONTAINS toLower($keyword) OR
                  toLower(toString(n.title)) CONTAINS toLower($keyword)
            WITH labels(n)[0] as entityType, count(*) as count
            ORDER BY count DESC
            LIMIT $limit
            RETURN entityType, count
            """
            
            entity_result = session.run(entity_query, keyword=keyword, limit=limit)
            entity_types = [{"type": record["entityType"], "count": record["count"]} for record in entity_result]
            
            # Get relationship types
            rel_query = """
            CALL db.relationshipTypes() YIELD relationshipType
            RETURN relationshipType, count(*) as count 
            LIMIT $limit
            """
            
            rel_result = session.run(rel_query, limit=limit)
            relationship_types = [{"type": record["relationshipType"], "count": 0} for record in rel_result]
            
            return {
                "entity_types": entity_types,
                "relationship_types": relationship_types,
                "keyword": keyword
            }
    
    except Exception as e:
        logger.error(f"Error exploring graph: {e}")
        raise HTTPException(status_code=500, detail=f"Error exploring graph: {str(e)}")

@app.get("/conversations", response_model=Dict[str, List[Dict[str, str]]])
async def list_conversations():
    """
    List all active conversations (for debugging purposes)
    """
    return conversation_store

@app.delete("/conversations/{session_id}")
async def delete_conversation(session_id: str):
    """
    Delete a specific conversation
    """
    if session_id in conversation_store:
        del conversation_store[session_id]
        if session_id in last_activity:
            del last_activity[session_id]
        return {"status": "success", "message": f"Conversation {session_id} deleted"}
    else:
        raise HTTPException(status_code=404, detail=f"Conversation {session_id} not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)