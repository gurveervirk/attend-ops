# SQL Export

Generated on 2025-04-08 15:05:49.971531335 UTC by Fabricate v1.1.0

## Instructions

To load the data into your PostgreSQL database, execute the following command replacing the values with your own:

```bash
export PGPASSWORD=<password>
psql postgres://<user>@<host>:<port>/<db> -f load.sql
```

## Exported tables

This is the list of exported tables, with their corresponding row count:

    attendance_records: 100 rows
    employees: 100 rows
    teams: 100 rows