import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
import zipfile
import shutil

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
        project = body.get("project")   # "US" or "Oakley"
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

# -------------------------------- 
# SAVE ZIP TO DIRECTORY WANTED
@csrf_exempt
def save_zip(request):

    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    uploaded_file = request.FILES.get("file")
    entry = request.POST.get("entry")

    if not uploaded_file:
        return JsonResponse({"error": "No file received"}, status=400)

    if not entry:
        return JsonResponse({"error": "No entry provided"}, status=400)

    base_directory = r"C:\Users\SamonteMJ\Documents\.backup\zipBackUp"

    save_directory = os.path.join(base_directory, entry)
    os.makedirs(save_directory, exist_ok=True)

    # 🔥 CLEAN SAFE FILE NAME (IMPORTANT)
    zip_name = os.path.basename(uploaded_file.name)

    zip_path = os.path.join(base_directory, zip_name)

    try:

        # SAVE ZIP
        with open(zip_path, "wb+") as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        # EXTRACT ZIP
        with zipfile.ZipFile(zip_path, "r") as zip_ref:

            for member in zip_ref.infolist():

                if member.is_dir():
                    continue

                parts = member.filename.split("/")

                if len(parts) > 1:
                    parts = parts[1:]

                relative_path = "/".join(parts)

                target_path = os.path.join(save_directory, relative_path)

                os.makedirs(os.path.dirname(target_path), exist_ok=True)

                with zip_ref.open(member) as source, open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)

        return JsonResponse({
            "success": True,
            "entry_folder": save_directory
        })

    finally:
        # 🧹 FORCE DELETE (ALWAYS RUNS)
        if os.path.exists(zip_path):
            try:
                os.remove(zip_path)
                print(f"Deleted ZIP: {zip_path}")
            except Exception as e:
                print(f"Failed to delete ZIP: {e}")