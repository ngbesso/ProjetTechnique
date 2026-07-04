from pydantic import BaseModel


class MonthCount(BaseModel):
    month: str
    count: int


class MonthAmount(BaseModel):
    month: str
    amount: float


class MemberStats(BaseModel):
    total: int
    active: int
    pending: int
    inactive: int
    rejected: int
    by_month: list[MonthCount]


class ChurchStats(BaseModel):
    total: int
    affiliates: int


class DonationStats(BaseModel):
    total_cad: float
    total_usd: float
    count: int
    by_category: dict[str, float]
    by_month: list[MonthAmount]


class SermonStats(BaseModel):
    total: int
    published: int
    draft: int
    archived: int


class PendingMemberItem(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    created_at: str


class DashboardStats(BaseModel):
    membres: MemberStats
    eglises: ChurchStats
    dons: DonationStats
    sermons: SermonStats
    recent_pending: list[PendingMemberItem]
