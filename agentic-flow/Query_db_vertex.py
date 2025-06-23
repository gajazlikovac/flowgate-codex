
import os
import sys
import logging
import numpy as np
from astrapy import DataAPIClient
from dotenv import load_dotenv
from langchain_google_vertexai import VertexAI, VertexAIEmbeddings

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger("rag_processor")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

# Constants
PROJECT_ID = "clear-decision"
LOCATION = "us-central1"
VERTEX_MODEL_NAME = "gemini-pro"
VERTEX_EMBEDDING_MODEL = "text-embedding-004"

# Astra DB Configuration (Ensure to set these as environment variables)
ASTRA_DB_APPLICATION_TOKEN = "AstraCS:LajAECnhDkGHIMhoazRqToKk:44649fcba3c358e87c243a9155cab9dd97660d8be886a29f8f8ec07016b4fecb" # Store your token in environment variables
ASTRA_DB_ENDPOINT = "https://22a8f720-922f-49c3-a77c-39ebca086788-eu-west-1.apps.astra.datastax.com"
ASTRA_DB_KEYSPACE = "default_keyspace"
ASTRA_COLLECTION_NAME = "pdf_embeddings"

def get_astra_db_session():
    """Connects to Astra DB and returns the database session."""
    if not ASTRA_DB_APPLICATION_TOKEN:
        raise ValueError("Astra DB token is missing. Set ASTRA_DB_APPLICATION_TOKEN in environment variables.")

    client = DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
    db = client.get_database_by_api_endpoint(ASTRA_DB_ENDPOINT, keyspace=ASTRA_DB_KEYSPACE)
    logger.info(f"Connected to Astra DB: {db.list_collection_names()}")
    return db

def generate_query_embedding(query):
    """Generates an embedding for the input query using Vertex AI."""
    try:
        embedding_model = VertexAIEmbeddings(model_name=VERTEX_EMBEDDING_MODEL, project=PROJECT_ID, location=LOCATION)
        embedding = embedding_model.embed_documents([query])[0]
        logger.info("Query embedding generated successfully.")
        return embedding
    except Exception as e:
        logger.error(f"Failed to generate query embedding: {str(e)}")
        raise

def cosine_similarity(vec1, vec2):
    """Computes cosine similarity between two vectors."""
    vec1, vec2 = np.array(vec1), np.array(vec2)
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def retrieve_top_n_chunks(query, top_n=3):
    """Retrieves the top N most relevant document chunks from Astra DB based on query embedding."""
    db = get_astra_db_session()
    collection = db.get_collection(ASTRA_COLLECTION_NAME)
    query_embedding = generate_query_embedding(query)

    documents = collection.find({})
    ranked_chunks = []

    for doc in documents:
        chunk_embedding = doc.get("embedding")
        if chunk_embedding:
            similarity = cosine_similarity(query_embedding, chunk_embedding)
            ranked_chunks.append((similarity, doc["chunk_text"]))

    ranked_chunks.sort(reverse=True, key=lambda x: x[0])
    top_chunks = [chunk for _, chunk in ranked_chunks[:top_n]]

    logger.info(f"Retrieved {len(top_chunks)} relevant chunks.")
    return top_chunks

def generate_answer_from_chunks(query, chunks):
    """Generates a final answer using Gemini Pro based on retrieved document chunks."""
    context = "\n\n".join(chunks) if chunks else "No relevant context found."
    prompt = f"""
    You are an expert AI assistant. Use the provided information to answer the user's query accurately.

    Context:
    {context}

    User Query:
    {query}

    Provide a detailed, structured response:
    """
    try:
        model = VertexAI(model=VERTEX_MODEL_NAME, project=PROJECT_ID, location=LOCATION)
        response = model.invoke(prompt)
        logger.info("Generated response from Vertex AI.")
        return response.strip()
    except Exception as e:
        logger.error(f"Failed to generate response with Vertex AI: {str(e)}")
        raise

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python rag_script.py '<query>'")
        sys.exit(1)

    query = sys.argv[1]
    logger.info(f"Processing RAG query: {query}")

    top_chunks = retrieve_top_n_chunks(query, top_n=3)
    final_answer = generate_answer_from_chunks(query, top_chunks)

    print("\nFinal Answer:")
    print(final_answer)


# import os
# import sys
# import logging
# import numpy as np
# from astrapy import DataAPIClient
# from dotenv import load_dotenv
# from langchain_google_vertexai import VertexAI, VertexAIEmbeddings

# # Load environment variables
# load_dotenv()

# # Configure logging
# logger = logging.getLogger("rag_processor")
# logger.setLevel(logging.INFO)
# handler = logging.StreamHandler()
# formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
# handler.setFormatter(formatter)
# logger.addHandler(handler)

# # Constants
# PROJECT_ID = "clear-decision"
# LOCATION = "us-central1"
# VERTEX_MODEL_NAME = "gemini-pro"
# VERTEX_EMBEDDING_MODEL = "text-embedding-004"

# # Astra DB Configuration
# ASTRA_DB_APPLICATION_TOKEN = "AstraCS:LajAECnhDkGHIMhoazRqToKk:44649fcba3c358e87c243a9155cab9dd97660d8be886a29f8f8ec07016b4fecb"
# ASTRA_DB_ENDPOINT = "https://22a8f720-922f-49c3-a77c-39ebca086788-eu-west-1.apps.astra.datastax.com"
# ASTRA_DB_KEYSPACE = os.getenv("ASTRA_DB_KEYSPACE", "default_keyspace")
# ASTRA_COLLECTION_NAME = "pdf_embeddings"

# # Connect to Astra DB once
# client = DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
# db = client.get_database_by_api_endpoint(ASTRA_DB_ENDPOINT, keyspace=ASTRA_DB_KEYSPACE)
# collection = db.get_collection(ASTRA_COLLECTION_NAME)

# # Initialize embedding model once
# embedding_model = VertexAIEmbeddings(model_name=VERTEX_EMBEDDING_MODEL, project=PROJECT_ID, location=LOCATION)

# # Initialize LLM model once
# llm_model = VertexAI(model=VERTEX_MODEL_NAME, project=PROJECT_ID, location=LOCATION)

# def generate_query_embedding(query):
#     """Generates an embedding for the input query using Vertex AI (optimized)."""
#     try:
#         embedding = embedding_model.embed_query(query)
#         logger.info("Query embedding generated successfully.")
#         return embedding
#     except Exception as e:
#         logger.error(f"Failed to generate query embedding: {str(e)}")
#         raise

# def retrieve_top_n_chunks(query, top_n=3):
#     """Retrieves the top N most relevant document chunks using Astra DB's vector search."""
#     try:
#         query_embedding = generate_query_embedding(query)

#         # Vector search instead of fetching all documents
#         search_results = collection.vector_search(
#             vector=query_embedding,  # Use vector search
#             limit=top_n,  # Fetch only top_n results
#             fields=["chunk_text"]
#         )

#         top_chunks = [doc["chunk_text"] for doc in search_results]
#         logger.info(f"Retrieved {len(top_chunks)} relevant chunks.")
#         return top_chunks

#     except Exception as e:
#         logger.error(f"Failed to retrieve chunks from Astra DB: {str(e)}")
#         return []

# def generate_answer_from_chunks(query, chunks):
#     """Generates a final answer using Gemini Pro based on retrieved document chunks."""
#     if not chunks:
#         return "No relevant context found."

#     context = "\n\n".join(chunks)
#     prompt = f"""
#     You are an expert AI assistant. Use the provided information to answer the user's query accurately.

#     Context:
#     {context}

#     User Query:
#     {query}

#     Provide a detailed, structured response:
#     """
#     try:
#         response = llm_model.invoke(prompt)
#         logger.info("Generated response from Vertex AI.")
#         return response.strip()
#     except Exception as e:
#         logger.error(f"Failed to generate response with Vertex AI: {str(e)}")
#         return "ERROR: Unasble to generate a reponse."

# if __name__ == "__main__":
#     if len(sys.argv) < 2:
#         print("Usage: python rag_script.py '<query>'")
#         sys.exit(1)

#     query = sys.argv[1]
#     logger.info(f"Processing RAG query: {query}")

#     top_chunks = retrieve_top_n_chunks(query, top_n=3)
#     final_answer = generate_answer_from_chunks(query, top_chunks)

#     print("\nFinal Answer:")
#     print(final_answer)

