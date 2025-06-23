import os
import logging
import pymupdf
import uuid
from dotenv import load_dotenv
from astrapy import DataAPIClient
from google.auth import load_credentials_from_file
from langchain_google_vertexai import VertexAI, VertexAIEmbeddings

load_dotenv()

logger = logging.getLogger("pdf_processor")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

PROJECT_ID = "clear-decision"  # Google Cloud Project ID
LOCATION = "us-central1"  # Update based on your Vertex AI region
VERTEX_MODEL_NAME = "gemini-pro"  # Use Gemini Pro for chat
VERTEX_EMBEDDING_MODEL = "text-embedding-004"  # Use Vertex AI for embeddings

# Authenticate Vertex AI
GOOGLE_CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
credentials, _ = load_credentials_from_file(GOOGLE_CREDENTIALS_PATH)

# ASTRA_DB_APPLICATION_TOKEN = "AstraCS:UvEoXTwZtSwNlEmZQCYmoICl:d72c3d77fdba44549b6316a09610658a8b888e51482b5e2772ae8e6ca07da062" # Store your token in environment variables
# ASTRA_DB_ENDPOINT = "https://1125dfc2-3d37-4556-97ce-0dde4897441f-us-east1.apps.astra.datastax.com"
# ASTRA_DB_KEYSPACE = "rag_1"
# ASTRA_COLLECTION_NAME = "pdf_embeddings"

ASTRA_DB_APPLICATION_TOKEN = "AstraCS:LajAECnhDkGHIMhoazRqToKk:44649fcba3c358e87c243a9155cab9dd97660d8be886a29f8f8ec07016b4fecb" # Store your token in environment variables
ASTRA_DB_ENDPOINT = "https://22a8f720-922f-49c3-a77c-39ebca086788-eu-west-1.apps.astra.datastax.com"
ASTRA_DB_KEYSPACE = "default_keyspace"
ASTRA_COLLECTION_NAME = "pdf_embeddings"

def get_astra_db_session():
    """
    Returns an Astra DB client session using the Data API.
    """
    if not ASTRA_DB_APPLICATION_TOKEN:
        raise ValueError("Astra DB token is missing. Set ASTRA_DB_APPLICATION_TOKEN in your environment variables.")

    client = DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
    db = client.get_database_by_api_endpoint(ASTRA_DB_ENDPOINT, keyspace=ASTRA_DB_KEYSPACE)

    logger.info(f"Connected to Astra DB: {db.list_collection_names()}")
    return db


def extract_and_chunk_text(pdf_path, chunk_size=768):
    """
    Extract text from a PDF and split it into smaller chunks.
    """
    with pymupdf.open(pdf_path) as doc:
        text = ""
        for page in doc:
            text += page.get_text()

    logger.info("Extracted text from the PDF.")

    chunks = []
    current_chunk = []

    for line in text.split("\n"):
        current_chunk.append(line.strip())
        if len(" ".join(current_chunk)) > chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = []

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    logger.info(f"Generated {len(chunks)} text chunks.")
    return chunks


def generate_embeddings_in_batches(text_list, batch_size=3):
    """
    Generate embeddings in batches to reduce API calls.
    """
    embedding_model = VertexAIEmbeddings(model_name=VERTEX_EMBEDDING_MODEL, project=PROJECT_ID, location=LOCATION)
    embeddings = []

    for i in range(0, len(text_list), batch_size):
        batch = text_list[i:i + batch_size]
        embeddings.extend(embedding_model.embed_documents(batch))
        logger.info(f"Processed batch {i // batch_size + 1}, sleeping for 4 seconds...")
        time.sleep(4)  # Sleep after each batch

    return embeddings


def insert_chunk_to_astra(document_name, chunk, embedding):
    """
    Insert a document chunk and its embedding into Astra DB.
    """
    db = get_astra_db_session()
    collection = db.get_collection(ASTRA_COLLECTION_NAME)

    chunk_id = str(uuid.uuid4())  # Generate a unique ID
    truncated_embedding = embedding[:768]  # Ensure size limits

    document = {
        "_id": chunk_id,
        "document_name": document_name,
        "chunk_text": chunk,
        "embedding": truncated_embedding
    }

    collection.insert_one(document)
    logger.info(f"Inserted chunk for document: {document_name} with chunk_id: {chunk_id}")

import time
def preprocess_and_store_embeddings(pdf_path, document_name):
    """
    Preprocess a document, generate embeddings, and store them in Astra DB.
    """
    logger.info(f"Starting preprocessing and embedding generation for document: {document_name}")

    chunks = extract_and_chunk_text(pdf_path)

    for idx, chunk in enumerate(chunks):
        embedding =  generate_embeddings_in_batches([chunk])[0]
        insert_chunk_to_astra(document_name, chunk, embedding)

        # Add a 4-second delay after every 3 embeddings to prevent quota exhaustion
        if (idx + 1) % 3 == 0:
            logger.info("Sleeping for 4 seconds to prevent quota exhaustion...")
            time.sleep(4)

    logger.info(f"Completed processing and storing embeddings for document: {document_name}")


def chat_with_vertex_ai(prompt):
    """
    Generate a response using Vertex AI's Gemini model via LangChain.
    """
    try:
        model = VertexAI(model=VERTEX_MODEL_NAME, project=PROJECT_ID, location=LOCATION, credentials=credentials)
        response = model.invoke(prompt)

        logger.info(f"Vertex AI response: {response}")
        return response
    except Exception as e:
        logger.error(f"Failed to generate response with Vertex AI: {str(e)}")
        raise


if __name__ == "__main__":
    file_path = "/home/fiftyfive/Downloads/RAG_PJR/ISO Standards/ISO Standards/ISO_IEC 30134-2(2016).pdf"
    document_name = "ISO_IEC 30134-2(2016).pdf"

    # Process PDF and store embeddings
    preprocess_and_store_embeddings(file_path, document_name)

    # Generate a chat response using Vertex AI
    user_prompt = ""
    response = chat_with_vertex_ai(user_prompt)
    print(f"Vertex AI Response:\n{response}")
