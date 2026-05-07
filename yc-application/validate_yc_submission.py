import os
import re
import sys

# Configuration
REQUIRED_FILES = [
    "TASK_INVENTORY.md",
    "COMPLIANCE.md",
    "UPGRADE_ROADMAP.md",
    "TRACEABILITY_MATRIX.md",
]

BUNDLE_PLACEHOLDERS = [
    "PITCH_DECK.pdf",
    "ONE_PAGE_TEASER.pdf",
    "DATA_ROOM_INDEX.md",
]

def check_file_existence(base_path):
    print("--- Checking Required Files ---")
    missing = []
    for f in REQUIRED_FILES:
        path = os.path.join(base_path, f)
        if os.path.exists(path):
            print(f"[PASS] Found {f}")
        else:
            print(f"[FAIL] Missing {f}")
            missing.append(f)
    return missing

def check_placeholders(base_path):
    print("\n--- Checking Bundle Placeholders ---")
    missing = []
    for f in BUNDLE_PLACEHOLDERS:
        path = os.path.join(base_path, f)
        if os.path.exists(path):
            print(f"[PASS] Found {f}")
        else:
            print(f"[WARN] Placeholder {f} not yet created")
            missing.append(f)
    return missing

def check_checklist_completion(base_path):
    print("\n--- Checking Checklist Completion ---")
    files_to_check = ["TASK_INVENTORY.md", "COMPLIANCE.md"]
    incomplete = 0
    for f in files_to_check:
        path = os.path.join(base_path, f)
        if not os.path.exists(path): continue
        
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
            # Find all "[ ]" or "[x]" / "[X]"
            matches = re.findall(r'\[\s*\]', content)
            if matches:
                print(f"[FAIL] {f} has {len(matches)} incomplete tasks")
                incomplete += len(matches)
            else:
                print(f"[PASS] {f} is fully checked off")
    return incomplete

def validate_yc_formatting(base_path):
    print("\n--- Validating YC Formatting Guidelines ---")
    # Rule: One-liners should be concise (less than 15 words)
    # We'll check the first header in TASK_INVENTORY as a proxy for the mission statement
    path = os.path.join(base_path, "TASK_INVENTORY.md")
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as file:
            first_line = file.readline()
            if "Application" in first_line:
                print("[PASS] Title follows YC standard")
    
    # Check for traceability matrix links
    path = os.path.join(base_path, "TRACEABILITY_MATRIX.md")
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
            if "|" in content and "REQ-" in content:
                print("[PASS] Traceability matrix formatted correctly")
            else:
                print("[FAIL] Traceability matrix missing or malformed")

def main():
    base_path = os.path.dirname(os.path.abspath(__file__))
    
    missing_files = check_file_existence(base_path)
    check_placeholders(base_path)
    incomplete_tasks = check_checklist_completion(base_path)
    validate_yc_formatting(base_path)
    
    print("\n--- Summary ---")
    if not missing_files and incomplete_tasks == 0:
        print("RESULT: Application package is VALID and ready for submission.")
    else:
        print(f"RESULT: Application package has {len(missing_files)} missing files and {incomplete_tasks} incomplete tasks.")
        sys.exit(1)

if __name__ == "__main__":
    main()
