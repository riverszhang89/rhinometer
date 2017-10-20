#include <rhinometer.h>

cson_value *get_database_details(struct MHD_Connection *conn, char *error, size_t sz)
{
    cdb2_hndl_tp *hndl = NULL;
    const char *q, *row, *ctxs;
    char *ctxdup = NULL;
    char *last, *tok;
    int rc, i, j, ii;
    char query[4096];
    int wr;

    cson_value *root, *arrv, *node, *perf;
    cson_array *arr, *subarr;
    cson_object *obj;

    root = NULL;

    q = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "q");
    if (q == NULL) {
        snprintf(error, sz, "Missing argument `%c'", 'q');
        return NULL;
    }

    ctxs = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "ctxs");
    if (ctxs == NULL) {
        snprintf(error, sz, "Missing argument `%s'", "ctxs");
        return NULL;
    }
    ctxdup = strdup(ctxs);

    root = cson_value_new_object();
    obj = cson_value_get_object(root);
    cson_object_set(obj, "q", cson_value_new_string(q, strlen(q)));

    /* Get perf data */
    rc = CDB2_OPEN(&hndl);
    if (rc != 0)
        goto out;

    arrv = cson_value_new_array();
    cson_object_set(obj, "perf", arrv);
    arr = cson_value_get_array(arrv);

    wr = snprintf(query, sizeof(query), "SELECT context, context_count, "
            "CAST(start AS INTEGER) AS starttime, CAST(end AS INTEGER) AS endtime "
            "FROM contexts WHERE (now() - start) <= CAST(14 AS DAY) AND context IN (\"\"");
    last = tok = NULL;
    tok = strtok_r(ctxdup, ",", &last);
    for (i = 1; tok != NULL; ++i) {
        wr += snprintf(query + wr, sizeof(query) - wr, ", @c%d", i);
        cdb2_bind_index(hndl, i, CDB2_CSTRING, tok, strlen(tok));
        tok = strtok_r(NULL, ",", &last);
    }
    wr += snprintf(query + wr, sizeof(query) - wr, ") AND dbname=@db");
    cdb2_bind_index(hndl, i, CDB2_CSTRING, q, strlen(q));
    snprintf(query + wr, sizeof(query) - wr, " ORDER BY start");

    /* Get 2-week perf data */
    rc = cdb2_run_statement(hndl, query);
    if (rc != 0)
        goto out;

    cdb2_clearbindings(hndl);
    for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i) {
        perf = cson_value_new_object();
        obj = cson_value_get_object(perf);

        for (j = 0; j != cdb2_numcolumns(hndl); ++j) {
            switch (cdb2_column_type(hndl, j)) {
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

    /* Get database data */
    rc = CDB2_OPEN_DB(&hndl, q);
    if (rc != 0)
        goto out;

    rc = cdb2_run_statement(hndl, "SELECT CAST(SUM(bytes) AS TEXT) FROM comdb2_tablesizes");
    if (rc != 0)
        goto out;

    obj = cson_value_get_object(root);
    for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i) {
        row = cdb2_column_value(hndl, 0);
        cson_object_set(obj, "size", cson_value_new_string(row, strlen(row)));
    }

    obj = cson_value_get_object(root);
    arrv = cson_value_new_array();
    cson_object_set(obj, "a", arrv);
    arr = cson_value_get_array(arrv);

    /* Get cluster info. */
    rc = cdb2_run_statement(hndl, "EXEC PROCEDURE sys.info.cluster()");

    if (rc != 0)
        goto out;

    for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i) {
        node = cson_value_new_object();
        obj = cson_value_get_object(node);

        for (j = 0; j != cdb2_numcolumns(hndl); ++j) {
            if (strcasecmp(cdb2_column_name(hndl, j), "host") == 0) {
                row = cdb2_column_value(hndl, j);
                cson_object_set(obj, "host", cson_value_new_string(row, strlen(row)));
            } else if (strcasecmp(cdb2_column_name(hndl, j), "master") == 0) {
                cson_object_set(obj, "master", cson_value_new_integer(*(long long *)cdb2_column_value(hndl, j)));
            }
        }
        cson_array_set(arr, i, node);
    }

    cdb2_close(hndl);

    for (j = 0; j != i; ++j) {
        node = cson_array_get(arr, j);
        obj = cson_value_get_object(node);

        rc = cdb2_open(&hndl, q, cson_value_get_cstr(cson_object_get(obj, "host")), CDB2_DIRECT_CPU);
        /* machine offline. continue. */
        if (rc != 0)
            goto next;

        arrv = cson_value_new_array();
        cson_object_set(obj, "stat", arrv);
        subarr = cson_value_get_array(arrv);

        rc = cdb2_run_statement(hndl, "exec procedure sys.cmd.send('stat')");
        /* machine offline. continue. */
        if (rc != 0)
            goto next;

        for (ii = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++ii) {
            row = cdb2_column_value(hndl, 0);
            cson_array_set(subarr, ii, cson_value_new_string(row, strlen(row)));
        }

        rc = cdb2_run_statement(hndl, "exec procedure sys.cmd.send('memstat group_by_name')");
        /* machine offline. continue. */
        if (rc != 0)
            goto next;

        arrv = cson_value_new_array();
        cson_object_set(obj, "memstat", arrv);
        subarr = cson_value_get_array(arrv);

        for (ii = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ) {
            row = cdb2_column_value(hndl, 0);
            if (strncmp(row, "------", 6) != 0) {
              cson_array_set(subarr, ii, cson_value_new_string(row, strlen(row)));
              ++ii;
            }
        }
next:
        rc = 0;
        cdb2_close(hndl);
        hndl = NULL;
    }

out:
    free(ctxdup);
    cdb2_close(hndl);
    if (rc != 0 && rc != CDB2_OK_DONE) {
        snprintf(error, sz, "%d: %s", rc, cdb2_errstr(hndl));
        cson_value_free(root);
        root = NULL;
    }
    return root;
}
