from pydantic import BaseModel


class PrayerAlertItem(BaseModel):
    id: int
    member_name: str
    created_at: str


class PrayerAlertStats(BaseModel):
    pending: int
    recent: list[PrayerAlertItem]


class VolunteerAlertItem(BaseModel):
    id: int
    member_name: str
    event_title: str
    created_at: str


class VolunteerAlertStats(BaseModel):
    pending: int
    recent: list[VolunteerAlertItem]


class ActivityItem(BaseModel):
    type: str
    label: str
    date: str


class DashboardStats(BaseModel):
    membres_pending: int
    prieres: PrayerAlertStats
    benevolat: VolunteerAlertStats
    recent_activity: list[ActivityItem]
