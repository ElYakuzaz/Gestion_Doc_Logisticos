import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
import zipfile
import shutil
from dotenv import load_dotenv
import paramiko
import tempfile
import time #para pruebas de tiempo de envio de archivos
from datetime import datetime, timedelta
from django.shortcuts import render  # ← Agrega esta línea


# folder_name = (datetime.now() + timedelta(days=2)).strftime("%Y%m%d") #to obtain 2 dias en avance, si hoy es 5/14, el folder sera 5/16
load_dotenv()

JSON_PATH = os.path.join(settings.BASE_DIR, "entries.json")

def load_data():
    try:
        with open(JSON_PATH, "r") as f:
            return json.load(f)
    except:
        return {}


def save_data(data):
    with open(JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)


@csrf_exempt
def mark_entry(request):

    if request.method == "POST":

        body = json.loads(request.body)

        entry = body.get("entry")
        project = body.get("project")   # "US" or "Oakley FOR NOW ----- can change"
        status = body.get("status")

        data = load_data()

        # create entry if not exists
        if entry not in data:
            data[entry] = {
                "US": None,
                "Oakley": None
            }

        # determine opposite project
        other_project = "Oakley" if project == "US" else "US"

        # update current project
        data[entry][project] = status

        # if success -> opposite becomes false
        if status is True:
            data[entry][other_project] = False

        save_data(data)

        return JsonResponse({"ok": True})


@csrf_exempt
def check_entry(request):
    if request.method == "POST":

        body = json.loads(request.body)

        entry = body.get("entry")
        project = str(body.get("project"))

        data = load_data()

        done = data.get(entry, {}).get(project, False)

        return JsonResponse({"done": done})
    
@csrf_exempt
def check_entry_all(request):
    if request.method == "POST":

        body = json.loads(request.body)
        entry = body.get("entry")

        data = load_data()

        entry_data = data.get(entry)

        if not entry_data:
            return JsonResponse({
                "US": None,
                "Oakley": None
            })

        # force missing keys to null
        return JsonResponse({
            "US": entry_data.get("US", None),
            "Oakley": entry_data.get("Oakley", None)
        })

# ---------------------------------------------  WOOOOOOOOOOOOOOOOOOO ----------------------------------------------------------
# ---------------------------------------------  DATA SAVED TO WINSCP ----------------------------------------------------------
# SAVE ZIP TO DIRECTORY WANTED WIN SCP STUFF
@csrf_exempt
def save_zip(request):

    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    uploaded_file = request.FILES.get("file")
    entry = request.POST.get("entry")
    folder_date = request.POST.get("folder_date")

    if not folder_date:
        return JsonResponse({
            "success": False,
            "error": "folder_date is REQUIRED"
        }, status=400)

    if not uploaded_file:
        return JsonResponse({"error": "No file received"}, status=400)

    if not entry:
        return JsonResponse({"error": "No entry provided"}, status=400)

    # --------------------------------
    # ENV VARIABLES 
    host = os.getenv("LAPLACE_SERVER")
    port = int(os.getenv("LAPLACE_PORT"))
    username = os.getenv("LAPLACE_USER")
    password = os.getenv("LAPLACE_PASS")
    remote_base_dir = os.getenv("LAPLACE_DIRECTORY")

    # remote_entry_dir = f"{remote_base_dir}/pruebas/{entry}"
    # folder_name = (datetime.now() + timedelta(days=2)).strftime("%Y%m%d")
    folder_name = folder_date.replace("-", "")
    
    remote_entry_dir = f"{remote_base_dir}/{folder_name}/{entry}"

    # --------------------------------
    # TEMP DIR 
    temp_dir = tempfile.mkdtemp()

    zip_name = os.path.basename(uploaded_file.name)
    zip_path = os.path.join(temp_dir, zip_name)

    def connect_sftp():
        transport = paramiko.Transport((host, port))
        transport.connect(username=username, password=password)
        transport.set_keepalive(30)
        sftp = paramiko.SFTPClient.from_transport(transport)
        return transport, sftp

    def ensure_dir(sftp, path):
        current = ""
        for folder in path.split("/"):
            if not folder:
                continue
            current += f"/{folder}"
            try:
                sftp.stat(current)
            except:
                try:
                    sftp.mkdir(current)
                except:
                    pass

    def upload_with_retry(sftp, local, remote, name, retries=3):
        for attempt in range(1, retries + 1):
            try:
                sftp.put(local, remote)
                print(f"YA SE SUBIO -- UPLOADED: {name}")
                return True
            except Exception as e:
                print(f"⚠️ Attempt {attempt} failed for {name}: {e}")
                time.sleep(2)

        print(f" FINAL FAIL: {name}")
        return False

    try:

        # --------------------------------
        # SAVE ZIP LOCALLY 
        with open(zip_path, "wb+") as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        # --------------------------------
        # EXTRACT ZIP 
        extract_dir = os.path.join(temp_dir, entry)
        os.makedirs(extract_dir, exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as zip_ref:

            for member in zip_ref.infolist():
                if member.is_dir():
                    continue

                parts = member.filename.split("/")
                if len(parts) > 1:
                    parts = parts[1:]

                relative_path = "/".join(parts)
                target_path = os.path.join(extract_dir, relative_path)

                os.makedirs(os.path.dirname(target_path), exist_ok=True)

                with zip_ref.open(member) as source, open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)

        # --------------------------------
        # CONNECT TO SFTP 
        start_time = time.time()
        print("Starting SFTP transfer...")

        transport, sftp = connect_sftp()

        # ensure base folders
        try:
            sftp.stat(f"{remote_base_dir}/{folder_name}")
        except:
            sftp.mkdir(f"{remote_base_dir}/{folder_name}")

        try:
            sftp.stat(remote_entry_dir)
        except:
            sftp.mkdir(remote_entry_dir)

        # --------------------------------
        # UPLOAD FILES 
        for root, dirs, files in os.walk(extract_dir):

            for file in files:

                local_file_path = os.path.join(root, file)

                relative_path = os.path.relpath(
                    local_file_path,
                    extract_dir
                ).replace("\\", "/")

                remote_file_path = f"{remote_entry_dir}/{relative_path}"
                remote_folder = os.path.dirname(remote_file_path)

                ensure_dir(sftp, remote_folder)

                print(f"⬆ Se esta subiendo - Uploading: {relative_path}")

                success = upload_with_retry(
                    sftp,
                    local_file_path,
                    remote_file_path,
                    file,
                    retries=3
                )

                # if failed, reconnect once and retry
                if not success:
                    print("🔄 Reconnecting SFTP...")

                    try:
                        sftp.close()
                        transport.close()
                    except:
                        pass

                    transport, sftp = connect_sftp()

                    upload_with_retry(
                        sftp,
                        local_file_path,
                        remote_file_path,
                        file,
                        retries=2
                    )

        # --------------------------------
        # CLEANUP CONNECTION 
        try:
            sftp.close()
            transport.close()
        except:
            pass

        total_time = time.time() - start_time
        print(f"TOTAL TRANSFER TIME: {total_time:.2f}s")

        return JsonResponse({
            "success": True,
            "remote_directory": remote_entry_dir
        })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
#--------------------------------------------------------------------------
        
# SAVE ZIP TO DIRECTORY WANTED FOR LOCAL USE ONLY ------------------------
# @csrf_exempt
# def save_zip(request):

#     if request.method != "POST":
#         return JsonResponse({
#             "error": "Only POST allowed"
#         }, status=405)

#     uploaded_file = request.FILES.get("file")

#     if not uploaded_file:
#         return JsonResponse({
#             "error": "No file received"
#         }, status=400)

#     # YOUR CUSTOM DIRECTORY
#     save_directory = r"C:\Users\SamonteMJ\Documents\.backup\zipBackUp"

#     os.makedirs(save_directory, exist_ok=True)

#     file_path = os.path.join(
#         save_directory,
#         uploaded_file.name
#     )

#     with open(file_path, "wb+") as destination:
#         for chunk in uploaded_file.chunks():
#             destination.write(chunk)

#     return JsonResponse({
#         "success": True,
#         "path": file_path
#     })


# ========================================================== COSAS PARA ENVIOS DE ARCHIVOS LOCALMENTE =========================
# ---------------------------------------------  LOCAL EXPORT MODE -------------------------------------------------
# # RENDER LOCAL EXPORT PAGE
# def local_export(request):
#     """Render the local export page"""
#     return render(request, 'local_export.html')

# SAVE ZIP TO LOCAL DIRECTORY (for local export mode - NO JSON tracking)


@csrf_exempt
def save_zip_local(request):

    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    uploaded_file = request.FILES.get("file")
    entry = request.POST.get("entry")
    local_directory = request.POST.get("local_directory")

    if not uploaded_file:
        return JsonResponse({"error": "No file received"}, status=400)

    if not entry:
        return JsonResponse({"error": "No entry provided"}, status=400)

    if not local_directory:
        return JsonResponse({"error": "No local directory provided"}, status=400)

    # Create full directory path: base/entry/ (sin folder_date)
    save_directory = os.path.join(local_directory, entry)
    
    try:
        os.makedirs(save_directory, exist_ok=True)
        
        # Save the zip file
        zip_name = f"{entry}.zip"
        zip_path = os.path.join(save_directory, zip_name)
        
        with open(zip_path, "wb+") as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
        
        # Extract zip contents
        extract_dir = os.path.join(save_directory, "_extracted_temp")
        os.makedirs(extract_dir, exist_ok=True)
        
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(extract_dir)
        
        # Move files from extracted folder
        extracted_entry_folder = os.path.join(extract_dir, entry)
        
        if os.path.exists(extracted_entry_folder):
            for root, dirs, files in os.walk(extracted_entry_folder):
                for file in files:
                    src_path = os.path.join(root, file)
                    rel_path = os.path.relpath(src_path, extracted_entry_folder)
                    dst_path = os.path.join(save_directory, rel_path)
                    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                    
                    if os.path.exists(dst_path):
                        base, ext = os.path.splitext(file)
                        counter = 1
                        while os.path.exists(dst_path):
                            dst_path = os.path.join(save_directory, f"{base}_{counter}{ext}")
                            counter += 1
                    
                    shutil.move(src_path, dst_path)
        else:
            for root, dirs, files in os.walk(extract_dir):
                for file in files:
                    src_path = os.path.join(root, file)
                    rel_path = os.path.relpath(src_path, extract_dir)
                    dst_path = os.path.join(save_directory, rel_path)
                    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                    
                    if os.path.exists(dst_path):
                        base, ext = os.path.splitext(file)
                        counter = 1
                        while os.path.exists(dst_path):
                            dst_path = os.path.join(save_directory, f"{base}_{counter}{ext}")
                            counter += 1
                    
                    shutil.move(src_path, dst_path)
        
        # Clean up
        shutil.rmtree(extract_dir, ignore_errors=True)
        os.remove(zip_path)
        
        print(f"✅ Local export saved: {entry} → {save_directory}")
        
        return JsonResponse({
            "success": True,
            "path": save_directory,
            "entry": entry
        })
        
    except Exception as e:
        print(f"❌ Error saving local export for {entry}: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)  
        