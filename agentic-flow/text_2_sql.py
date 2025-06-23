import logging
import sys
import google.generativeai as genai
import psycopg2
import json
import os
import re
from dotenv import load_dotenv
from psycopg2 import pool

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "ADS_SensoruimAMT"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "Pse;^klIyaf_,f`b"),
    "host": os.getenv("DB_HOST", "34.116.242.171"),
    "port": os.getenv("DB_PORT", "5432"),
}
conn_pool = psycopg2.pool.SimpleConnectionPool(
    1, 10, **DB_CONFIG 
)

def get_connection():
    """Fetches a connection from the pool."""
    return conn_pool.getconn()

def release_connection(conn):
    """Releases the connection back to the pool."""
    conn_pool.putconn(conn)

def get_db_schema():
    """Fetch schema details from PostgreSQL database (cached to avoid repeated calls)."""
    if os.path.exists("schema_cache.json"):
        with open("schema_cache.json", "r") as f:
            return json.load(f)

    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [row[0] for row in cur.fetchall()]

        schema_info = {}

        for table in tables:
            cur.execute(f"""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = '{table}'
            """)
            schema_info[table] = {row[0]: row[1] for row in cur.fetchall()}

        cur.close()
        release_connection(conn)

        with open("schema_cache.json", "w") as f:
            json.dump(schema_info, f)

        return schema_info

    except Exception as e:
        print("Error fetching database schema:", e)
        return {}

def clean_sql_output(response_text):
    """Removes Markdown formatting and extracts a clean SQL query."""
    cleaned_sql = re.sub(r"```sql|```", "", response_text, flags=re.IGNORECASE).strip()
    return cleaned_sql

def generate_sql_query(user_query, schema_info):
    """Uses Gemini AI to convert natural language to SQL."""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")  
        prompt = f"""
        You are an expert SQL generator for PostgreSQL databases.
        Generate an optimized SQL query based on the given database schema.
        Ensure the SQL query is syntactically correct and does not include unnecessary formatting.
        Ensure that relationships between tables are correctly handled.
        Use the provided schema to understand the database structure and Hirarchy.
        write column names in double quotes (") and table names in double quotes (").
        Use column names that exist in the schema only. 
        Do nott use any other column names.
        Use all the tables related to the query. Join the tables if any columns is needed using the correct syntax if necessary.
        If user is giving values take it as a string and use it as it is in the query.


        Database Schema:
        {json.dumps(schema_info, indent=2)}

        User Query:
        {user_query}

        SQL Query:
        """
        response = model.generate_content(prompt)
        sql_query = clean_sql_output(response.text)

        return sql_query if sql_query.lower().startswith("select") else "ERROR: Invalid SQL generated."

    except Exception as e:
        print("Error generating SQL query:", e)
        return "ERROR: Unable to generate SQL."


def execute_sql_query(sql_query):
    """Executes an SQL query on PostgreSQL and returns results."""
    if "ERROR" in sql_query:
        return {"error": "Invalid SQL query, execution skipped."}

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        cur.execute(sql_query)
        results = cur.fetchall()
        colnames = [desc[0] for desc in cur.description]

        cur.close()
        conn.close()

        return [dict(zip(colnames, row)) for row in results]

    except Exception as e:
        return {"error": str(e)}


logger = logging.getLogger("sql_processor")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sql_script.py '<query>'")
        sys.exit(1)

    user_query = sys.argv[1]
    logger.info(f"Processing SQL Query: {user_query}")

    schema = get_db_schema()
    sql_query = generate_sql_query(user_query, schema)

    print("Generated SQL:\n", sql_query)

    result = execute_sql_query(sql_query)
    print("Query Result:\n", result)