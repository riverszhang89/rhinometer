#include <rhinometer.h>

cson_value *get_context_details(struct MHD_Connection *conn, char *error, size_t sz)
{
    cdb2_hndl_tp *hndl = NULL;
    const char *q, *row, *dbs;
    char *dbdup = NULL;
    char *last, *tok;
    int rc, i, j;
    char query[4096];
    int wr;

    cson_value *root, *arrv, *perf;
    cson_array *arr;
    cson_object *obj;

    root = NULL;

    q = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "q");
    if (q == NULL) {
        snprintf(error, sz, "Missing argument `%c'", 'q');
        return NULL;
    }

    dbs = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "dbs");
    if (dbs == NULL) {
        snprintf(error, sz, "Missing argument `%s'", "dbs");
        return NULL;
    }
    dbdup = strdup(dbs);

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

    wr = snprintf(query, sizeof(query), "SELECT dbname, context_count, "
            "CAST(start AS INTEGER) AS starttime, CAST(end AS INTEGER) AS endtime "
            "FROM contexts WHERE (now() - start) <= CAST(14 AS DAY) "
            "AND start <= now() AND dbname IN (\"\"");
    last = tok = NULL;
    tok = strtok_r(dbdup, ",", &last);
    for (i = 1; tok != NULL; ++i) {
        wr += snprintf(query + wr, sizeof(query) - wr, ", @d%d", i);
        cdb2_bind_index(hndl, i, CDB2_CSTRING, tok, strlen(tok));
        tok = strtok_r(NULL, ",", &last);
    }
    wr += snprintf(query + wr, sizeof(query) - wr, ") AND context=@ctx");
    cdb2_bind_index(hndl, i, CDB2_CSTRING, q, strlen(q));
    snprintf(query + wr, sizeof(query) - wr, " ORDER BY start");

    puts(query);
    /* Get 2-week perf data */
    rc = cdb2_run_statement(hndl, query);
    if (rc != 0)
        goto out;

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

out:
    free(dbdup);
    if (rc != 0 && rc != CDB2_OK_DONE) {
        snprintf(error, sz, "%d: %s", rc, cdb2_errstr(hndl));
        cson_value_free(root);
        root = NULL;
    }
    cdb2_close(hndl);
    return root;
}
