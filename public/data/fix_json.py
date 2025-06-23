import json

# Load the original file
with open("environmental_permit.json", "r") as f:
    data = json.load(f)

# Fix step_1 by nesting question keys under 'questions'
step_1 = data.get("step_1", {})
questions = {}
keys_to_remove = []

for key, value in step_1.items():
    if key.startswith("question_"):
        questions[key] = value
        keys_to_remove.append(key)

# Remove old flat question keys
for key in keys_to_remove:
    del step_1[key]

# Add them under a proper 'questions' key
step_1["questions"] = questions

# Save the fixed file
with open("environmental_permit_fixed_step1.json", "w") as f:
    json.dump(data, f, indent=2)
