\echo 'Creating service databases...'

CREATE DATABASE order_db;
CREATE DATABASE payment_db;
CREATE DATABASE restaurant_db;
CREATE DATABASE delivery_db;


GRANT ALL PRIVILEGES ON DATABASE order_db      TO postgres;
GRANT ALL PRIVILEGES ON DATABASE payment_db    TO postgres;
GRANT ALL PRIVILEGES ON DATABASE restaurant_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE delivery_db   TO postgres;

\echo 'All databases created successfully.'