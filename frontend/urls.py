from django.urls import path
from . import views

urlpatterns = [
    path('', views.home),
    path('api/test/', views.test_api),
    path('local-export/', views.local_export, name='local_export'),
]

