# 

ifneq ($(emv),)
emv:
	@echo $($(emv))
endif


SRCS = \
	Makefile \
	geeoh.html \
	geeoh.css \
	geeoh.js \

SRCS += fslocal.html fslocal.js

TGZDIR = /tmp
TGZ = ${TGZDIR}/geeoh.tgz


lgeeoh.html: Makefile geeoh.html
	sed -e 's=http://ajax.googleapis.com/ajax/libs/=jq/=g' \
	  < geeoh.html > $@

rgeeoh.js: Makefile geeoh.js
	sed \
	 -e 's=function debug_log(message)=function debug_log_co(message)=' \
	 -e 's=function debug_log_dummy(message)=function debug_log(message)=' \
	  < geeoh.js > $@

tgz: ${TGZ}
${TGZ} : ${SRCS}
	tar czf $@ ${SRCS}
	tar tvzf $@; ls -lG $@

