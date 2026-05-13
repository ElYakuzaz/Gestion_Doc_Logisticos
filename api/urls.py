from django.urls import path
from . import views
from api.views import check_entry_all, save_zip

urlpatterns = [
    path("mark-entry/", views.mark_entry),
    path("check-entry/", views.check_entry),
    path("check-entry-all/", check_entry_all),
    path("save-zip/", save_zip),
]