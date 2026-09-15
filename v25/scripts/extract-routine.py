"""Robust extractor for the DIU routine PDF converted with `pdftotext -layout`.

Handles both normal one-line classroom rows and two-line lab rows where the room
and the course/teacher are printed on separate lines.
"""
import re, sys, json

path = sys.argv[1]
lines = open(path, encoding="utf-8", errors="ignore").read().splitlines()

days = ["SATURDAY","SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY"]
times = ["08:30-10:00","10:00-11:30","11:30-01:00","01:00-02:30","02:30-04:00","04:00-05:30"]

# The timetable columns are detected from the six printed time headings.
# Do not assume a fixed character width: different PDF extractors can emit
# slightly different spacing while keeping the same visual column layout.
def detect_columns(line):
    starts = []
    cursor = 0
    for time in times:
        pos = line.find(time, cursor)
        if pos < 0:
            return None
        starts.append(pos)
        cursor = pos + len(time)
    return starts

def slot_at(pos, columns):
    if not columns or len(columns) != 6:
        return max(0, min(5, pos // 50))
    return min(range(6), key=lambda i: abs(pos - columns[i]))

# Nested parentheses occur in retake sections such as RE_A(3C).
course_re = re.compile(r"[A-Z]{2,5}\d{3}\((?:[^()]|\([^()]*\))*\)")
room_re = re.compile(r"(?:KT|G1|ANX1|ANX2|SH)-\d{3}(?:\([A-Z]\))?")
teacher_re = re.compile(r"\b[A-Z][A-Z0-9_]{0,10}\b")

# Locate exact day header lines; do not use substring searching because day words
# can appear in other parts of the PDF.
headers = []
for i, line in enumerate(lines):
    word = line.strip().upper()
    if word in days:
        headers.append((i, word))

out = []
seen = set()
for h, (start, day) in enumerate(headers):
    end = headers[h + 1][0] if h + 1 < len(headers) else len(lines)
    rooms = [""] * 6
    columns = [0, 50, 100, 150, 200, 250]

    for line in lines[start + 1:end]:
        detected = detect_columns(line)
        if detected:
            columns = detected
            continue
        # A lab row prints the room names on one line and course/teacher on the
        # next, so keep the most recent room for each time column.
        for m in room_re.finditer(line):
            rooms[slot_at(m.start(), columns)] = m.group(0)

        courses = list(course_re.finditer(line))
        for ci, m in enumerate(courses):
            slot = slot_at(m.start(), columns)
            room = rooms[slot]
            if not room:
                continue

            # On both normal and lab rows, the teacher appears after the course
            # and before the next course printed on the same physical line.
            tail_end = courses[ci + 1].start() if ci + 1 < len(courses) else len(line)
            tail = line[m.end():tail_end]
            teacher = ""
            for tm in teacher_re.finditer(tail):
                cand = tm.group(0)
                if cand not in {"ROOM", "COURSE", "TEACHER", "COM", "LAB"}:
                    teacher = cand
                    break
            if not teacher:
                continue

            item = {
                "day": day.title(),
                "time": times[slot],
                "room": room,
                "courseSection": m.group(0),
                "teacher": teacher,
            }
            key = tuple(item.values())
            if key not in seen:
                seen.add(key)
                out.append(item)

for item in out:
    print(json.dumps(item, ensure_ascii=False))
