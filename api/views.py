import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os

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
        status = body.get("status")     # True / False

        data = load_data()

        if entry not in data:
            data[entry] = {
                "US": None,
                "Oakley": None
            }

        # ensure keys exist but DO NOT force false
        if "US" not in data[entry]:
            data[entry]["US"] = None

        if "Oakley" not in data[entry]:
            data[entry]["Oakley"] = None

        # only update current project
        data[entry][project] = status

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