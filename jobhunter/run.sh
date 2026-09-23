#!/bin/bash
# Cron entrypoint: full hunter run with the project venv.
cd /home/hatch/workspace/jobhunter || exit 1
./venv/bin/python run.py
