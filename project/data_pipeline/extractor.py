
import uuid
import json
'''from playwright.sync_api import sync_playwright
from googlesearch import search'''
import psycopg2
import os
from dotenv import load_dotenv
from data_pipeline.extractor_utils import get_ipo_url_professional, get_data, get_pinata_url
from data_pipeline.sample_upload import upload_pdf_to_astra
from typing import Optional, Dict, Any




# Load the variables from the .env file into the system environment
load_dotenv()

def clean(val):
        if not val: return 0.0
        return float(str(val).replace(',', '').replace('%', '').strip())


def extract_ipo_metrics(file_path):
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    tables = data.get('tables', {})
    
    # Helper function to find a keyword anywhere in the JSON tables
    def find_key(keyword):
        for table_id, content in tables.items():
            if keyword in content:
                value = content[keyword]
                # If it's a list, return the first item (usually the most recent)
                return value[0] if isinstance(value, list) else value
        return None

    # Dynamically extract metrics regardless of table number
    pe_ratio    = find_key('P/E (x)')
    eps         = find_key('EPS (₹)')
    roe         = find_key('ROE')
    roce        = find_key('ROCE')
    pat         = find_key('Profit After Tax')
    revenue     = find_key('Total Income') # Revenue is often called Total Income here

    return {
        "PE Ratio": pe_ratio,
        "EPS": eps,
        "ROE": roe,
        "ROCE": roce,
        "PAT": pat,
        "Revenue": revenue
    }


def classify_company(revenue):
    # Priority 1: Revenue Classification
    if revenue >= 5000.00:
        return "Large"
    elif 500 <= revenue < 5000.00:
        return "Mid"
    elif revenue < 500.00:
        # Secondary check: High asset value can bump a small-revenue firm to Mid
        return "Small"
    print("the companyis classifeis")
    return "Unknown"


def onboard_new_ipo(company_name: str, source_url: Optional[str] = None, ipfs_cid: Optional[str] = None) -> str:
    print("✅ extractor.onboard_new_ipo called", company_name, source_url, ipfs_cid)

    """
    FastAPI: POST /api/v1/ipos
    - Scrape metrics + insert IPO row into Postgres
    - Return ipo_id (string)
    """
    ipo_id = str(uuid.uuid4())

    # Your current flow uses get_ipo_url_professional(name) and get_data(company)
    company_url = get_ipo_url_professional(company_name)
    get_data(company_url)

    metrics = extract_ipo_metrics("ipo_data.json")

    rev_val = clean(metrics.get("Revenue"))
    pe_val = clean(metrics.get("PE Ratio"))
    eps_val = clean(metrics.get("EPS"))
    roe_val = clean(metrics.get("ROE"))
    roce_val = clean(metrics.get("ROCE"))
    pat_val = clean(metrics.get("PAT"))

    cap_size = classify_company(rev_val)

    connection = None
    cursor = None
    try:
        connection = psycopg2.connect(
            dbname=os.environ["POSTGRES_DB"],
            user=os.environ["POSTGRES_USER"],
            password=os.environ["POSTGRES_PASSWORD"],
            host=os.environ["POSTGRES_HOST"],
            port=os.environ["POSTGRES_PORT"],
        )
        cursor = connection.cursor()

        insert_query = """
            INSERT INTO ipo (ipo_id, name, revenue, pe_ratio, eps, roce, roe, pat, cap_size, ipfs_doc_cid)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        record_to_insert = (ipo_id, company_name, rev_val, pe_val, eps_val, roce_val, roe_val, pat_val, cap_size, ipfs_cid)
        cursor.execute(insert_query, record_to_insert)
        connection.commit()

        return ipo_id

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def process_and_embed_prospectus(ipfs_cid: str, ipo_id: str) -> Dict[str, Any]:
    """
    FastAPI background job: POST /api/v1/ipos/{ipo_id}/embeddings
    - Convert CID -> gateway URL
    - Upload/chunk/embed into Astra via sample_upload.upload_pdf_to_astra
    """
    url_astra = get_pinata_url(ipfs_cid)

    # IMPORTANT: adjust this based on what upload_pdf_to_astra returns (Step 4)
    result = upload_pdf_to_astra(url_astra)

    # Normalize return for jobs endpoint
    if isinstance(result, dict) and "chunks_processed" in result:
        return {"ipo_id": ipo_id, "chunks_processed": result["chunks_processed"]}

    # fallback if upload_pdf_to_astra returns None/str
    return {"ipo_id": ipo_id, "chunks_processed": 0}
    
def run_ipo_pipeline(company_name: str, source_url: Optional[str] = None, ipfs_cid: Optional[str] = None) -> Dict[str, Any]:
    ipo_id = onboard_new_ipo(company_name=company_name, source_url=source_url, ipfs_cid=ipfs_cid)

    if not ipfs_cid:
        return {"ipo_id": ipo_id, "chunks_processed": 0}

    embed_result = process_and_embed_prospectus(ipfs_cid=ipfs_cid, ipo_id=ipo_id)
    if isinstance(embed_result, dict):
        return {"ipo_id": ipo_id, **embed_result}

    return {"ipo_id": ipo_id, "chunks_processed": 0}





'''
if __name__ == "__main__":
   print(add_to_table('905d48c5-9a21-4b9d-aa4f-e44f25a6af27','Innovision','bafybeidiitbmfuruxlwtzixi3dt54tt75gvycmrsyaglnwpo3pr7ljmuwa'))

'''