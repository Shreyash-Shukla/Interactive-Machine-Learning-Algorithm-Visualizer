"""Run from backend/: python scripts/create_password_hash.py"""
from getpass import getpass

from argon2 import PasswordHasher

password = getpass("New administrator password: ")
if len(password) < 12:
    raise SystemExit("Use at least 12 characters")
if password != getpass("Confirm password: "):
    raise SystemExit("Passwords do not match")
print("ADMIN_PASSWORD_HASH=" + PasswordHasher().hash(password))
