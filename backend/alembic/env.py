from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.session import Base
from app.models.user import User
from app.models.channel import Channel, MembershipTier, ChannelSubscription
from app.models.content import Content, Series
from app.models.wallet import UserWallet, WalletTransaction, PaymentTopup, CreatorWallet, CreatorEarning, CreatorPayout
from app.models.livestream import Livestream
from app.models.notification import Notification
from app.models.analytics import PlatformAnalyticsDaily, TrendingContent, MissingContentRequest
from app.models.platform import PlatformSetting, PlatformCostRecord, PlatformBudget
from app.models.promo import PromoCode, PromoRedemption

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Override with env var if set
database_url = os.getenv("DATABASE_URL", "").replace(
    "postgresql+asyncpg://", "postgresql://"
).replace("postgresql://", "postgresql://")

if database_url:
    config.set_main_option("sqlalchemy.url", database_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
