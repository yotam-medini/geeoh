# 

SRCS = \
	Makefile \
	geeoh.html \
	geeoh.css \
	geeoh.js \

SRCS += fslocal.html fslocal.js

TGZ = /tmp/geeoh.tgz


lgeeoh.html: Makefile geeoh.html
	sed -e 's=http://ajax.googleapis.com/ajax/libs/=jq/=g' \
	  < geeoh.html > $@

tgz: ${TGZ}
${TGZ} : ${SRCS}
	tar czf $@ ${SRCS}
	tar tvzf $@; ls -lG $@

