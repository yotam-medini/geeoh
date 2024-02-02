#!/bin/bash
#
#

set -u
now=$(date "+%Y-%m-%d %H:%M:%S")
flog=/tmp/geeoh-iocgi.log
touch ${flog}
chmod 0666 ${flog}
size=$(stat -c "%s" ${flog})
if [ ${size} -gt 1000000 ]
then
  # rotate
  rm -f ${flog}-old
  mv ${flog} ${flog}-old
  flog=/tmp/geeoh-iocgi.log
  touch ${flog}
  chmod 0666 ${flog}
fi
echo >> ${flog}
echo ${now} >> ${flog}
id  >> ${flog}
# echo HOME=${HOME} >> ${flog}
/bin/pwd >> ${flog}
dn=$(dirname ${0})
echo dn=${dn} >> ${flog}

home=${HOME}
if [ -d ${home}/swpub ]
then
  export PATH=${home}/swpub/bin:${PATH}
fi

rootgeeohiodir=${home}/geeoh
bindir=${rootgeeohiodir}/bin
vardir=${rootgeeohiodir}/var
cachedir=${rootgeeohiodir}/cache
logdir=${rootgeeohiodir}/log

debuglog=${logdir}/geeohio-cgi.log

cgeeohio=${bindir}/geeoh-io-client.py
if [ ! -x ${cgeeohio} ]
then
  echo No executable ${cgeeohio} >> ${flog}
  echo No executable ${cgeeohio} 1>&2
  exit 1
fi

echo exec python ${cgeeohio} -portfn ${vardir}/geeohio.port $@ >> ${flog}
exec python ${cgeeohio} -portfn ${vardir}/geeohio.port $@

