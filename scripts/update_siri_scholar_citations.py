#!/usr/bin/env python3
"""Refresh the SIRI paper's citation count from Zhongyu He's public Scholar profile."""

import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.request import Request, urlopen


PROFILE = "https://scholar.google.com/citations?user=O-E3TdAAAAAJ&hl=en"
TITLE = "SIRI: Self-Internalizing Reinforcement Learning with Intrinsic Skills for LLM Agent Training"
OUTPUT = Path(__file__).resolve().parents[1] / "SIRI/static/citations/siri-scholar.json"


class ScholarRows(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.row = None
        self.field = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "tr" and "gsc_a_tr" in classes:
            self.row = {"title": "", "count": "", "citation_url": ""}
        elif self.row is not None and tag == "a":
            if "gsc_a_at" in classes:
                self.field = "title"
            elif "gsc_a_ac" in classes:
                self.field = "count"
                self.row["citation_url"] = urljoin(PROFILE, attrs.get("href", ""))

    def handle_data(self, data):
        if self.row is not None and self.field:
            self.row[self.field] += data

    def handle_endtag(self, tag):
        if tag == "a":
            self.field = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def main():
    request = Request(
        PROFILE,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; SIRI citation updater)",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urlopen(request, timeout=20) as response:
        page = response.read(1_000_001)
    if len(page) > 1_000_000:
        raise RuntimeError("Google Scholar profile response was unexpectedly large")

    parser = ScholarRows()
    parser.feed(page.decode("utf-8", errors="replace"))
    matches = [row for row in parser.rows if row["title"].strip() == TITLE]
    if len(matches) != 1 or not matches[0]["count"].strip().isdigit():
        raise RuntimeError("SIRI citation row or count could not be verified")

    row = matches[0]
    parsed_url = urlparse(row["citation_url"])
    if parsed_url.hostname != "scholar.google.com" or not parse_qs(parsed_url.query).get("cites"):
        raise RuntimeError("SIRI citation-list URL could not be verified")

    count = int(row["count"].strip())
    current = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}
    if current.get("count") == count and current.get("citation_url") == row["citation_url"]:
        print(f"SIRI Google Scholar citations unchanged: {count}")
        return

    data = {
        "source": "Google Scholar",
        "profile_url": PROFILE,
        "citation_url": row["citation_url"],
        "title": TITLE,
        "count": count,
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"SIRI Google Scholar citations updated: {count}")


if __name__ == "__main__":
    main()
