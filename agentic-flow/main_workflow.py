# from fastapi import FastAPI, HTTPException
# import google.generativeai as genai
# import subprocess
# import os

# app = FastAPI(title="Query Orchestration API", version="1.0")

# API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyDAfRnmoBSK7ODK1aoWSrzlNzrVZaj0zpU")
# genai.configure(api_key=API_KEY)
# model = genai.GenerativeModel("gemini-1.5-flash-latest")

# RAG_SCRIPT_PATH = "/home/fiftyfive/Downloads/RAG_PJR/Query_db_vertex.py"
# SQL_SCRIPT_PATH = "/home/fiftyfive/Downloads/RAG_PJR/text_2_sql.py"

# def classify_query_gemini(query: str) -> str:
#     """
#     Uses Gemini AI to classify a query as either 'sql' or 'rag'.
#     """
#     prompt = f"""
#     You are a classification system that categorizes user queries as either 'sql' or 'rag'. 
#     - 'sql': The query is asking for structured data from a database.
#     - 'rag': The query is seeking unstructured information from stored documents.

#     Classify the following query accordingly. Respond ONLY with 'sql' or 'rag'—nothing else.

#     Query: {query}
#     """
#     response = model.generate_content(prompt)
#     return response.text.strip().lower() if response.text else "unknown"

# def execute_rag_query(query: str) -> str:
#     """Runs the RAG script with the given query and captures output."""
#     try:
#         result = subprocess.run(["python3", RAG_SCRIPT_PATH, query], capture_output=True, text=True)
#         return result.stdout if result.returncode == 0 else result.stderr
#     except Exception as e:
#         return f"Error executing RAG script: {str(e)}"


# def execute_sql_query(query: str) -> str:
#     """Runs the SQL processing script with the given query and captures output."""
#     try:
#         result = subprocess.run(["python3", SQL_SCRIPT_PATH, query], capture_output=True, text=True)
#         return result.stdout if result.returncode == 0 else result.stderr
#     except Exception as e:
#         return f"Error executing SQL script: {str(e)}"


# @app.post("/query")
# async def process_query(user_query: str):
#     """
#     Classifies the query and routes it to the appropriate execution pipeline.
#     """
#     if not user_query:
#         raise HTTPException(status_code=400, detail="Query cannot be empty.")

#     query_type = classify_query_gemini(user_query)
    
#     if query_type == "sql":
#         response = execute_sql_query(user_query)
#     elif query_type == "rag":
#         response = execute_rag_query(user_query)
#     else:
#         raise HTTPException(status_code=500, detail="Query classification failed.")

#     return {"query": user_query, "query_type": query_type, "response": response}



from fastapi import FastAPI, HTTPException
import google.generativeai as genai
import subprocess
import os

app = FastAPI(title="Query Orchestration API", version="1.1")

API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyDAfRnmoBSK7ODK1aoWSrzlNzrVZaj0zpU")
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash-latest")

RAG_SCRIPT_PATH = "/home/fiftyfive/Downloads/RAG_PJR/Query_db_vertex.py"
SQL_SCRIPT_PATH = "/home/fiftyfive/Downloads/RAG_PJR/text_2_sql.py"

def classify_query_gemini(query: str) -> str:
    """
    Classifies the query as 'sql', 'rag', or 'both'.
    """
    prompt = f"""
    You are a classification system that categorizes user queries as 'sql', 'rag', or 'both'.
    - 'sql': The query is asking for structured data from a database.
    - 'rag': The query is seeking unstructured information from stored documents.
    - 'both': The query requires both structured and unstructured data.
    
    Classify the following query accordingly. Respond ONLY with 'sql', 'rag', or 'both'—nothing else.

    Query: {query}
    """
    response = model.generate_content(prompt)
    return response.text.strip().lower() if response.text else "unknown"

def execute_script(script_path: str, query: str) -> str:
    """Executes a script with the given query and captures output."""
    try:
        result = subprocess.run(["python3", script_path, query], capture_output=True, text=True)
        return result.stdout if result.returncode == 0 else result.stderr
    except Exception as e:
        return f"Error executing script {script_path}: {str(e)}"

def combine_responses(rag_response: str, sql_response: str) -> str:
    """Combines RAG and SQL responses into a coherent final answer."""
    prompt = f"""
    You are an AI assistant that synthesizes information from different sources.
    Given the following responses, create a well-structured final answer:
    
    - RAG Response: {rag_response}
    - SQL Response: {sql_response}
    
    Generate a comprehensive yet concise response that merges both pieces of information logically.
    """
    response = model.generate_content(prompt)
    return response.text.strip() if response.text else "Error generating combined response."

@app.post("/query")
async def process_query(user_query: str):
    """
    Classifies the query and routes it to the appropriate execution pipeline.
    """
    if not user_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    query_type = classify_query_gemini(user_query)
    
    if query_type == "sql":
        response = execute_script(SQL_SCRIPT_PATH, user_query)
    elif query_type == "rag":
        response = execute_script(RAG_SCRIPT_PATH, user_query)
    elif query_type == "both":
        rag_response = execute_script(RAG_SCRIPT_PATH, user_query)
        sql_response = execute_script(SQL_SCRIPT_PATH, user_query)
        response = combine_responses(rag_response, sql_response)
    else:
        raise HTTPException(status_code=500, detail="Query classification failed.")

    return {"query": user_query, "query_type": query_type, "response": response}
