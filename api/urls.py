from django.urls import path
from . import views
from api.views import check_entry_all, save_zip

urlpatterns = [
    path("mark-entry/", views.mark_entry),
    path("check-entry/", views.check_entry),
    path("check-entry-all/", check_entry_all),
    path("save-zip/", save_zip),
    path('save-zip-local/', views.save_zip_local, name='save_zip_local'),
    # path('local-export/', views.local_export, name='local_export'),
]