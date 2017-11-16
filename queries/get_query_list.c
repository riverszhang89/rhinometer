#include <rhinometer.h>

cson_value *get_query_list(struct MHD_Connection *conn, char *error, size_t sz)
{
    cdb2_hndl_tp *hndl = NULL;
    const char *q, *ctxs, *row, *dbs;
    char *dbdup = NULL, *ctxdup = NULL;
    char *last, *tok;
    int rc, i, j, len;
    char query[4096], orderby[1024], where[4096];
    int wrw, wrob;

    cson_value *root, *arrv, *perf;
    cson_array *arr;
    cson_object *obj;
    root = NULL;

    /* DataTables precious { */
    const char *draw = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "draw");
    if (draw == NULL) {
        snprintf(error, sz, "Missing argument `%s'", "draw");
        return NULL;
    }

    const char *start = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "start");
    if (start == NULL) {
        snprintf(error, sz, "Missing argument `%s'", "start");
        return NULL;
    }

    const char *length = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "length");
    if (length == NULL) {
        snprintf(error, sz, "Missing argument `%s'", "length");
        return NULL;
    }

    /* This is a JSON array. Parse it. */
    const char *order = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "order");
    cson_value *cson;
    cson_parse_info info;
    cson_parse_opt opt = {.maxDepth = 32, .allowComments = 0};
    rc = cson_parse_string(&cson, order, strlen(order), &opt, &info);
    if (rc != 0)
        return NULL;
    cson_array *csonarr = cson_value_get_array(cson);
    /* } DataTables precious */

    q = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "q");

    ctxs = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "ctxs");
    if (ctxs == NULL) {
        snprintf(error, sz, "Missing argument `%s'", "ctxs");
        return NULL;
    }
    ctxdup = strdup(ctxs);

    dbs = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "dbs");
    if (dbs == NULL) {
        snprintf(error, sz, "Missing argument `%s'", "dbs");
        return NULL;
    }
    dbdup = strdup(dbs);

    root = cson_value_new_object();
    obj = cson_value_get_object(root);
    cson_object_set(obj, "ctxs", cson_value_new_string(ctxs, strlen(ctxs)));
    cson_object_set(obj, "dbs", cson_value_new_string(dbs, strlen(dbs)));
    cson_object_set(obj, "draw", cson_value_new_integer(atoi(draw)));

    /* Get perf data */
    rc = CDB2_OPEN(&hndl);
    if (rc != 0)
        goto out;

    arrv = cson_value_new_array();
    cson_object_set(obj, "raw", arrv);
    arr = cson_value_get_array(arrv);

    const char *SELECT_COLUMNS = 
                  "SELECT q.fingerprint,"
                  "       SUM(q.fingerprint_count) as count,"
                  "       q.dbname,"
                  "       q.context,"
                  "       CAST(qt.first_seen AS INTEGER) AS firstseentime," 
                  "       qt.sql,"
                  "       AVG(avgcost) AS avgcost, MIN(mincost) AS mincost, MAX(maxcost) AS maxcost,"
                  "       AVG(avgrows) AS avgrows, MIN(minrows) AS minrows, MAX(maxrows) AS maxrows,"
                  "       AVG(avgrtm) AS avgrtm, MIN(minrtm) AS minrtm, MAX(maxrtm) AS maxrtm,"
                  "       AVG(avglkws) AS avglkws, MIN(minlkws) AS minlkws, MAX(maxlkws) AS maxlkws,"
                  "       AVG(avglkwtm) AS avglkwtm, MIN(minlkwtm) AS minlkwtm, MAX(maxlkwtm) AS maxlkwtm,"
                  "       AVG(avgrds) AS avgrds, MIN(minrds) AS minrds, MAX(maxrds) AS maxrds,"
                  "       AVG(avgrdtm) AS avgrdtm, MIN(minrdtm) AS minrdtm, MAX(maxrdtm) AS maxrdtm,"
                  "       AVG(avgwrs) AS avgwrs, MIN(minwrs) AS minwrs, MAX(maxwrs) AS maxwrs,"
                  "       AVG(avgwrtm) AS avgwrtm, MIN(minwrtm) AS minwrtm, MAX(maxwrtm) AS maxwrtm "
                  ;


    wrw = snprintf(where, sizeof(where),
                   "FROM queries q JOIN querytypes qt "
                   "ON q.fingerprint = qt.fingerprint "
                   "WHERE "
                   "(now() - q.start) <= CAST(30 AS DAY) "
                   "AND "
                   "q.dbname IN (\"\"");

    /* Bind databases */
    last = tok = NULL;
    tok = strtok_r(dbdup, ",", &last);
    for (i = 1; tok != NULL; ++i) {
        wrw += snprintf(where + wrw, sizeof(where) - wrw, ", @d%d", i);
        cdb2_bind_index(hndl, i, CDB2_CSTRING, tok, strlen(tok));
        tok = strtok_r(NULL, ",", &last);
    }

    /* Bind contexts */
    wrw += snprintf(where + wrw, sizeof(where) - wrw, ") AND q.context IN (\"\"");

    last = tok = NULL;
    tok = strtok_r(ctxdup, ",", &last);
    for (; tok != NULL; ++i) {
        wrw += snprintf(where + wrw, sizeof(where) - wrw, ", @c%d", i);
        cdb2_bind_index(hndl, i, CDB2_CSTRING, tok, strlen(tok));
        tok = strtok_r(NULL, ",", &last);
    }

    /* Get count of all records */
    snprintf(query, sizeof(query), "SELECT COUNT(*) FROM (SELECT q.rowid %s %s",
             where, ") GROUP BY q.fingerprint)");

    rc = cdb2_run_statement(hndl, query);
    if (rc != 0)
        goto out;

    for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i)
        cson_object_set(obj, "recordsTotal",
                        cson_value_new_integer(*(long long *)cdb2_column_value(hndl, 0)));

    /* Get count of filtered records */
    if (q != NULL) {
        snprintf(query, sizeof(query), "SELECT COUNT(*) FROM (SELECT q.rowid %s"
                ") AND sql LIKE '%s' GROUP BY q.fingerprint)"
                , where, q);
        rc = cdb2_run_statement(hndl, query);
        if (rc != 0)
            goto out;

        for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i)
            cson_object_set(obj, "recordsFiltered",
                    cson_value_new_integer(*(long long *)cdb2_column_value(hndl, 0)));
    }


    /* 
       Convert json order to order by.
       1 - query
       2 - count

       3 - min runtime
       4 - avg runtime
       5 - max runtime

       6 - min cost
       7 - avg cost
       8 - max cost

       9  - min rows
       10 - avg rows
       11 - max rows

       12 - min lockwaits
       13 - avg lockwaits
       14 - max lockwaits

       15 - min lockwait time
       16 - avg lockwait time
       17 - max lockwait time

       18 - min page read
       19 - avg page read
       20 - max page read

       21 - min page read time
       22 - avg page read time
       23 - max page read time

       24 - min page write
       25 - avg page write
       26 - max page write

       27 - min page write time
       28 - avg page write time
       29 - max page write time

       30 - first seen time

       (Mind blown!)
     */
    int hasorderby = 0;
    orderby[0] = '\0';
    for (i = 0, len = cson_array_length_get(csonarr), wrob = 0; i != len; ++i) {
        cson_value *v = cson_array_get(csonarr, i);
        if (!cson_value_is_object(v))
            continue;

        cson_object *obj;
        cson_value_fetch_object(v, &obj);

        cson_value *colv = cson_object_get(obj, "column");
        if (colv == NULL)
            continue;
        int col = (int)cson_value_get_integer(colv);
        if (col <= 0)
            continue;

        cson_value *dirv = cson_object_get(obj, "dir");
        if (dirv == NULL)
            continue;
        const char *dir = cson_string_cstr(cson_value_get_string(dirv));

        if (hasorderby == 0) {
            wrob += snprintf(orderby + wrob, sizeof(orderby) - wrob, " ORDER BY ");
            hasorderby = 1;
        }

        const char *columnname = NULL;
        switch (col) {
            case 1:
                columnname = "qt.sql";
                break;
            case 2:
                columnname = "count";
                break;
            case 3:
                columnname = "minrtm";
                break;
            case 4:
                columnname = "avgrtm";
                break;
            case 5:
                columnname = "maxrtm";
                break;
            case 6:
                columnname = "mincost";
                break;
            case 7:
                columnname = "avgcost";
                break;
            case 8:
                columnname = "maxcost";
                break;
            case 9:
                columnname = "minrows";
                break;
            case 10:
                columnname = "avgrows";
                break;
            case 11:
                columnname = "maxrows";
                break;
            case 12:
                columnname = "minlkws";
                break;
            case 13:
                columnname = "avglkws";
                break;
            case 14:
                columnname = "maxlkws";
                break;
            case 15:
                columnname = "minlkwtm";
                break;
            case 16:
                columnname = "avglkwtm";
                break;
            case 17:
                columnname = "maxlkwtm";
                break;
            case 18:
                columnname = "minrds";
                break;
            case 19:
                columnname = "avgrds";
                break;
            case 20:
                columnname = "maxrds";
                break;
            case 21:
                columnname = "minrdtm";
                break;
            case 22:
                columnname = "avgrdtm";
                break;
            case 23:
                columnname = "maxrdtm";
                break;
            case 24:
                columnname = "minwrs";
                break;
            case 25:
                columnname = "avgwrs";
                break;
            case 26:
                columnname = "maxwrs";
                break;
            case 27:
                columnname = "minwrtm";
                break;
            case 28:
                columnname = "avgwrtm";
                break;
            case 29:
                columnname = "maxwrtm";
                break;
            case 30:
                columnname = "firstseentime";
                break;
        }

        if (columnname != NULL) {
            wrob += snprintf(orderby + wrob, sizeof(orderby) - wrob,
                    (i < len - 1) ? " %s %s, " : " %s %s ", columnname, dir);
        }
    }

    if (q != NULL)
        snprintf(query, sizeof(query),
                "%s %s) AND sql LIKE '%s' GROUP BY q.fingerprint %s LIMIT %d OFFSET %d",
                SELECT_COLUMNS, where, q, orderby, atoi(length), atoi(start));
    else
        snprintf(query, sizeof(query), "%s %s %s %s LIMIT %d OFFSET %d", SELECT_COLUMNS, where,
                ") GROUP BY q.fingerprint", orderby, atoi(length), atoi(start));

    puts(query);
    rc = cdb2_run_statement(hndl, query);
    if (rc != 0)
        goto out;

    for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i) {
        perf = cson_value_new_object();
        obj = cson_value_get_object(perf);

        for (j = 0; j != cdb2_numcolumns(hndl); ++j) {
            switch (cdb2_column_type(hndl, j)) {
            case CDB2_REAL:
                cson_object_set(obj, cdb2_column_name(hndl, j),
                        cson_value_new_double(*(double *)cdb2_column_value(hndl, j)));
                break;
            case CDB2_INTEGER:
                cson_object_set(obj, cdb2_column_name(hndl, j),
                        cson_value_new_integer(*(long long *)cdb2_column_value(hndl, j)));
                break;
            case CDB2_CSTRING:
                row = cdb2_column_value(hndl, j);
                cson_object_set(obj, cdb2_column_name(hndl, j),
                        cson_value_new_string(row, strlen(row)));
                break;
            default:
                fprintf(stderr, "Unexpected cdb2 type: %d.\n", cdb2_column_type(hndl, j));
                goto out;
            }
        }
        cson_array_set(arr, i, perf);
    }

out:
    free(dbdup);
    free(ctxdup);
    if (rc != 0 && rc != CDB2_OK_DONE) {
        snprintf(error, sz, "%d: %s", rc, cdb2_errstr(hndl));
        cson_value_free(root);
        root = NULL;
    }
    cdb2_close(hndl);
    return root;
}
