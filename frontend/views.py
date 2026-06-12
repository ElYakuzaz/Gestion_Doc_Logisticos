from django.shortcuts import render
from django.http import JsonResponse
from .pyCode.test import run_test

def home(request):
    return render(request, 'index.html')

def test_api(request):
    result = run_test()

    return JsonResponse({
        "message": result
    })

# VISTA LOCAL
def local_export(request):
    """Render the local export page"""
    return render(request, 'local_export.html')  