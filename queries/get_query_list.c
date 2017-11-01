#include <rhinometer.h>

cson_value *get_query_list(struct MHD_Connection *conn, char *error, size_t sz)
{
    cdb2_hndl_tp *hndl = NULL;
    const char *ctxs, *row, *dbs;
    char *dbdup = NULL, *ctxdup = NULL;
    char *last, *tok;
    int rc, i, j;
    char query[4096];
    int wrw;

    cson_value *root, *arrv, *perf;
    cson_array *arr;
    cson_object *obj;
    root = NULL;

    /* DataTables precious */
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

    const char *q = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "q");

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
                  "       SUM(avgcost * fingerprint_count) AS totcost, MIN(mincost) AS mincost, MAX(maxcost) AS maxcost,"
                  "       SUM(avgrows * fingerprint_count) AS totrows, MIN(minrows) AS minrows, MAX(maxrows) AS maxrows,"
                  "       SUM(avgrtm * fingerprint_count) AS totrtm, MIN(minrtm) AS minrtm, MAX(maxrtm) AS maxrtm,"
                  "       SUM(avglkws * fingerprint_count) AS totlkws, MIN(minlkws) AS minlkws, MAX(maxlkws) AS maxlkws,"
                  "       SUM(avglkwtm * fingerprint_count) AS totlkwtm, MIN(minlkwtm) AS minlkwtm, MAX(maxlkwtm) AS maxlkwtm,"
                  "       SUM(avgrds * fingerprint_count) AS totrds, MIN(minrds) AS minrds, MAX(maxrds) AS maxrds,"
                  "       SUM(avgrdtm * fingerprint_count) AS totrdtm, MIN(minrdtm) AS minrdtm, MAX(maxrdtm) AS maxrdtm,"
                  "       SUM(avgwrs * fingerprint_count) AS totwrs, MIN(minwrs) AS minwrs, MAX(maxwrs) AS maxwrs,"
                  "       SUM(avgwrtm * fingerprint_count) AS totwrtm, MIN(minwrtm) AS minwrtm, MAX(maxwrtm) AS maxwrtm "
                  ;

    char where[4096];

    wrw = snprintf(where, sizeof(where),
                   "FROM queries q JOIN querytypes qt "
                   "ON q.fingerprint = qt.fingerprint "
                   "WHERE "
                   "(now() - q.start) <= CAST(14 AS DAY) "
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
    puts(query);

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

    /* Get records */
    if (q != NULL)
        snprintf(query, sizeof(query),
                "%s %s) AND sql LIKE '%s' GROUP BY q.fingerprint LIMIT %d OFFSET %d",
                SELECT_COLUMNS, where, q, atoi(length), atoi(start));
    else
        snprintf(query, sizeof(query), "%s %s %s LIMIT %d OFFSET %d", SELECT_COLUMNS, where,
                ") GROUP BY q.fingerprint", atoi(length), atoi(start));

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
