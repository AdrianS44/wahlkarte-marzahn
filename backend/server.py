from fastapi import FastAPI, HTTPException, Depends, status, Form, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient
import csv
import io
from bson import ObjectId

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# MongoDB connection
MONGODB_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGODB_URL)
database = client.survey_dashboard
collection = database.survey_responses
users_collection = database.users

# Pydantic models
class SurveyResponse(BaseModel):
    location: str
    custom_address: Optional[str] = None  # Neue Option für beliebige Adressen
    age_group: str
    household_size: str
    satisfaction: str
    future_outlook: str
    topics_housing: str = ""
    topics_security: str = ""
    topics_education: str = ""
    topics_traffic: str = ""
    topics_environment: str = ""
    topics_community: str = ""
    social_media_usage: str = ""
    facebook: str = ""
    instagram: str = ""
    tiktok: str = ""
    youtube: str = ""
    whatsapp: str = ""
    info_source_social: str = ""
    info_source_print: str = ""
    info_source_tv: str = ""
    info_source_newsletter: str = ""
    info_source_events: str = ""
    political_representation: str = ""
    kiezmacher_known: str = ""
    engagement_wish: str = ""
    future_wishes: str = ""
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class User(BaseModel):
    username: str
    password: str
    role: str = "user"
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

# Database collections
users_collection = database.users

# Initialize default users if not exist
async def initialize_default_users():
    existing_admin = await users_collection.find_one({"username": "admin"})
    if not existing_admin:
        default_users = [
            {
                "username": "admin",
                "password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
                "role": "admin",
                "created_at": datetime.utcnow()
            },
            {
                "username": "testuser",
                "password": "$2b$12$LQv3c4yqBWxbQFcXAc5uNOyDXkOJ9n/vDOO8.4pPZD3XkOCKN8Xj6",  # password123
                "role": "user",
                "created_at": datetime.utcnow()
            }
        ]
        await users_collection.insert_many(default_users)
        print("Default users initialized")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    return {"username": username, "role": payload.get("role", "user")}

# Initialize default users on startup
@app.on_event("startup")
async def startup_event():
    await initialize_default_users()

# User management endpoints (admin only)
async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@app.get("/")
def read_root():
    return {"message": "Survey Dashboard API"}

@app.post("/api/login", response_model=Token)
async def login(login_request: LoginRequest):
    username = login_request.username
    password = login_request.password
    
    # Find user in database
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": username, "role": user["role"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user["role"]}

@app.get("/api/survey-responses")
async def get_survey_responses(current_user: dict = Depends(get_current_user)):
    """Get all survey responses"""
    responses = []
    async for response in collection.find():
        response["_id"] = str(response["_id"])
        responses.append(response)
    return responses

@app.post("/api/survey-responses")
async def create_survey_response(
    response: SurveyResponse,
    current_user: dict = Depends(get_current_user)
):
    """Create a new survey response"""
    response_dict = response.dict()
    response_dict["created_at"] = datetime.utcnow()
    response_dict["created_by"] = current_user["username"]
    
    result = await collection.insert_one(response_dict)
    return {"id": str(result.inserted_id), "message": "Survey response created successfully"}

@app.put("/api/survey-responses/{response_id}")
async def update_survey_response(
    response_id: str,
    response: SurveyResponse,
    current_user: dict = Depends(get_current_user)
):
    """Update a survey response"""
    try:
        response_dict = response.dict()
        response_dict["updated_at"] = datetime.utcnow()
        response_dict["updated_by"] = current_user["username"]
        
        result = await collection.update_one(
            {"_id": ObjectId(response_id)},
            {"$set": response_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Survey response not found")
            
        return {"message": "Survey response updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/survey-responses/{response_id}")
async def delete_survey_response(
    response_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a survey response"""
    try:
        result = await collection.delete_one({"_id": ObjectId(response_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Survey response not found")
            
        return {"message": "Survey response deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/import-csv")
async def import_csv_data(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import survey data from CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        contents = await file.read()
        csv_data = contents.decode('utf-8')
        
        csv_reader = csv.DictReader(io.StringIO(csv_data), delimiter=';')
        imported_count = 0
        
        for row in csv_reader:
            # Map CSV columns to database fields
            survey_data = {
                "location": row.get("Q00. In welchem Kiez wohnen Sie?"),
                "age_group": row.get("Q001. Wie alt sind Sie?"),
                "household_size": row.get("Q002. Wie viele Personen leben (inkl. Ihnen) in Ihrem Haushalt?"),
                "satisfaction": row.get("Q003. Wie zufrieden sind Sie mit dem Leben in Ihrem Kiez?"),
                "future_outlook": row.get("Q005. Wie blicken Sie in die Zukunft Ihres Kiezes?"),
                "topics_housing": row.get("Q004[SQ001]. Welche Themen beschäftigen Sie aktuell am meisten? [Wohnen / Mieten]"),
                "topics_security": row.get("Q004[SQ002]. Welche Themen beschäftigen Sie aktuell am meisten? [Sicherheit]"),
                "topics_education": row.get("Q004[SQ003]. Welche Themen beschäftigen Sie aktuell am meisten? [Bildung / Schule]"),
                "topics_traffic": row.get("Q004[SQ004]. Welche Themen beschäftigen Sie aktuell am meisten? [Verkehr]"),
                "topics_environment": row.get("Q004[SQ005]. Welche Themen beschäftigen Sie aktuell am meisten? [Umwelt]"),
                "topics_community": row.get("Q004[SQ006]. Welche Themen beschäftigen Sie aktuell am meisten? [Nachbarschaftliches Miteinander]"),
                "social_media_usage": row.get("Q012[SQ001]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Soziale Medien]"),
                "facebook": row.get("Q013[SQ001]. Welche sozialen Medien nutzen Sie? [Facebook]"),
                "instagram": row.get("Q013[SQ002]. Welche sozialen Medien nutzen Sie? [Instagram]"),
                "tiktok": row.get("Q013[SQ003]. Welche sozialen Medien nutzen Sie? [TikTok]"),
                "youtube": row.get("Q013[SQ004]. Welche sozialen Medien nutzen Sie? [YouTube]"),
                "whatsapp": row.get("Q013[SQ005]. Welche sozialen Medien nutzen Sie? [WhatsApp]"),
                "info_source_social": row.get("Q012[SQ001]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Soziale Medien]"),
                "info_source_print": row.get("Q012[SQ003]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Zeitung/Print-Medien]"),
                "info_source_tv": row.get("Q012[SQ004]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Fernsehen/TV]"),
                "info_source_newsletter": row.get("Q012[SQ006]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Newsletter]"),
                "info_source_events": row.get("Q012[SQ007]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Informationsveranstaltung]"),
                "political_representation": row.get("Q007. Wie stark fühlen Sie sich im Bezirk politisch vertreten?"),
                "kiezmacher_known": row.get('Q011. Haben Sie schon einmal etwas von den "Kiezmachern" gehört?'),
                "engagement_wish": row.get("Q009. Würden Sie sich gerne stärker bei lokalen Themen einbringen?"),
                "future_wishes": row.get("Q010. Was wünschen Sie sich für die Zukunft in Ihrem Kiez?"),
                "created_at": datetime.utcnow(),
                "created_by": current_user["username"],
                "import_source": "csv_upload"
            }
            
            # Only import rows with valid data
            if survey_data["location"] and survey_data["location"] != "N/A":
                await collection.insert_one(survey_data)
                imported_count += 1
        
        return {"message": f"Successfully imported {imported_count} survey responses"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error importing CSV: {str(e)}")

@app.get("/api/export-csv")
async def export_csv_data(current_user: dict = Depends(get_current_user)):
    """Export survey data to CSV format"""
    try:
        responses = []
        async for response in collection.find():
            response["_id"] = str(response["_id"])
            responses.append(response)
        
        if not responses:
            raise HTTPException(status_code=404, detail="No data to export")
        
        # Create CSV content
        output = io.StringIO()
        fieldnames = list(responses[0].keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        
        writer.writeheader()
        for response in responses:
            writer.writerow(response)
        
        csv_content = output.getvalue()
        output.close()
        
        return JSONResponse(
            content={"csv_data": csv_content},
            headers={"Content-Disposition": "attachment; filename=survey_export.csv"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error exporting CSV: {str(e)}")

@app.get("/api/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    try:
        total_responses = await collection.count_documents({})
        
        # Get responses by location
        location_pipeline = [
            {"$group": {"_id": "$location", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        location_stats = []
        async for doc in collection.aggregate(location_pipeline):
            if doc["_id"]:  # Exclude null locations
                location_stats.append({"location": doc["_id"], "count": doc["count"]})
        
        # Get responses by age group
        age_pipeline = [
            {"$group": {"_id": "$age_group", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        age_stats = []
        async for doc in collection.aggregate(age_pipeline):
            if doc["_id"]:  # Exclude null age groups
                age_stats.append({"age_group": doc["_id"], "count": doc["count"]})
        
        return {
            "total_responses": total_responses,
            "location_distribution": location_stats,
            "age_distribution": age_stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error getting stats: {str(e)}")

@app.get("/api/users")
async def get_users(admin_user: dict = Depends(require_admin)):
    """Get all users (admin only)"""
    users = []
    async for user in users_collection.find():
        user["_id"] = str(user["_id"])
        user.pop("password", None)  # Don't return password
        users.append(user)
    return users

@app.post("/api/users")
async def create_user(user: User, admin_user: dict = Depends(require_admin)):
    """Create a new user (admin only)"""
    # Check if user already exists
    existing_user = await users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    new_user = {
        "username": user.username,
        "password": hashed_password,
        "role": user.role,
        "created_at": datetime.utcnow(),
        "created_by": admin_user["username"]
    }
    
    result = await users_collection.insert_one(new_user)
    return {"id": str(result.inserted_id), "message": "User created successfully"}

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, user: User, admin_user: dict = Depends(require_admin)):
    """Update a user (admin only)"""
    try:
        # Check if new username already exists (if changed)
        existing_user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if existing_user["username"] != user.username:
            username_exists = await users_collection.find_one({"username": user.username})
            if username_exists:
                raise HTTPException(status_code=400, detail="Username already exists")
        
        update_data = {
            "username": user.username,
            "role": user.role,
            "updated_at": datetime.utcnow(),
            "updated_by": admin_user["username"]
        }
        
        # Only update password if provided
        if user.password:
            update_data["password"] = get_password_hash(user.password)
        
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {"message": "User updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, admin_user: dict = Depends(require_admin)):
    """Delete a user (admin only)"""
    try:
        # Don't allow deleting the current admin user
        user_to_delete = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user_to_delete:
            raise HTTPException(status_code=404, detail="User not found")
            
        if user_to_delete["username"] == admin_user["username"]:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        result = await users_collection.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
