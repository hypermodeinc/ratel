#!/bin/bash

function wait-for-healthy() {
    echo "wait-for-healthy: Waiting for $1 to return 200 OK"
    until curl -sL -w "%{http_code}\\n" "$1" -o /dev/null | grep -q 200; do
          sleep 0.2
    done
    echo "wait-for-healthy: Done."
}

dir="$( cd "$( echo "${BASH_SOURCE[0]%/*}" )" && pwd )"
rootdir="$dir/.."
clientdir="$dir/../client"
composedir="$clientdir/src/e2etests"

# Use this file for docker-compose commands
export COMPOSE_FILE=docker-compose.prod.yml

cd "$rootdir"

if [ ! -f "$rootdir/build/ratel" ]; then
    ./scripts/build.prod.sh
fi

# Run Ratel and Dgraph
pushd "$composedir" > /dev/null
   set -e
   docker-compose up --force-recreate --remove-orphans --detach
   set +e
popd > /dev/null
wait-for-healthy localhost:8080/health

# Run tests
pushd "$clientdir" > /dev/null
  # Workaround: Use ?local to run production Ratel builds for e2e tests
  TEST_DGRAPH_SERVER="http://localhost:8080" TEST_RATEL_URL="http://localhost:8000?local" npm test
  testresults="$?"
popd > /dev/null

# Cleanup
pushd "$composedir" > /dev/null
  docker-compose down && docker-compose rm -f
popd > /dev/null
exit $testresults
