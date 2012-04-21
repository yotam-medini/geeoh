# 

SRCS = \
	Makefile \
	geeoh.html \
	geeoh.js \

TGZ = /tmp/geeoh.tgz


lgeeoh.html: Makefile geeoh.html
	sed -e 's=http://ajax.googleapis.com/ajax/libs/jquery.*/1.7.2/==g' \
	  < geeoh.html > $@

tgz: ${TGZ}
${TGZ} : ${SRCS}
	tar czf $@ ${SRCS}
	tar tvzf $@; ls -lG $@

