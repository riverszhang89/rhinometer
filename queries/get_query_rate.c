#include <rhinometer.h>

cson_value *get_query_rate(struct MHD_Connection *conn, char *error, size_t sz)
{
    int rc, i;

    /* query components */
    char query[4096];
    size_t wr = 0;
    const char *SELECT =
        "SELECT SUM(fingerprint_count) AS count,"
        "       CAST(start AS INTEGER) AS starttime,"
        "       CAST(end AS INTEGER) AS endtime"
        "       FROM queries WHERE (now() - start) <= CAST(14 AS DAY) AND dbname IN (\"\"";

    /* database handle */
    cdb2_hndl_tp *hndl = NULL;

    /* contexts and databases, plus variables for strtok(). */
    const char *ctxs, *dbs;
    char *dbdup = NULL, *ctxdup = NULL;
    char *last, *tok;

    /* cson */
    cson_value *root, *arrv, *count;
    cson_array *arr;
    cson_object *obj;
    root = NULL;

    /* HTTP GET arguments */
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

    /* Initialize handle. We need it now to bind params. */
    rc = CDB2_OPEN(&hndl);
    if (rc != 0)
        goto out;

    /* strcat */
    wr = snprintf(query, sizeof(query), SELECT);
    last = tok = NULL;
    tok = strtok_r(dbdup, ",", &last);
    for (i = 1; tok != NULL; ++i) {
        wr += snprintf(query + wr, sizeof(query) - wr, ", @d%d", i);
        cdb2_bind_index(hndl, i, CDB2_CSTRING, tok, strlen(tok));
        tok = strtok_r(NULL, ",", &last);
    }


    wr += snprintf(query + wr, sizeof(query) - wr, ") AND context IN (\"\"");

    last = tok = NULL;
    tok = strtok_r(ctxdup, ",", &last);
    for (; tok != NULL; ++i) {
        wr += snprintf(query + wr, sizeof(query) - wr, ", @c%d", i);
        cdb2_bind_index(hndl, i, CDB2_CSTRING, tok, strlen(tok));
        tok = strtok_r(NULL, ",", &last);
    }
    snprintf(query + wr, sizeof(query) - wr, ") ORDER BY start");

    /* Run the query */
    puts(query);
    rc = cdb2_run_statement(hndl, query);
    if (rc != 0)
        goto out;

    /* Initialize the CSON structure */
    root = cson_value_new_object();
    obj = cson_value_get_object(root);
    cson_object_set(obj, "ctxs", cson_value_new_string(ctxdup, strlen(ctxdup)));
    cson_object_set(obj, "dbs", cson_value_new_string(dbdup, strlen(dbdup)));
    arrv = cson_value_new_array();
    cson_object_set(obj, "counts", arrv);
    arr = cson_value_get_array(arrv);

    for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i) {
        count = cson_value_new_object();
        obj = cson_value_get_object(count);
        switch (cdb2_column_type(hndl, i)) {
        case CDB2_INTEGER:
            cson_object_set(obj, cdb2_column_name(hndl, i),
                    cson_value_new_integer(*(long long *)cdb2_column_value(hndl, i)));
            break;
        default:
            fprintf(stderr, "Unexpected cdb2 type: %d.\n", cdb2_column_type(hndl, i));
            goto out;
        }
        cson_array_set(arr, i, count);
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
