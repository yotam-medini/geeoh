# 

ifneq ($(emv),)
emv:
	@echo $($(emv))
endif

now := $(shell date --utc "+%Y-%m-%d-%H%M%S") utc

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

geeoh.js: geeoh-in.js Makefile
	sed \
	 -e 's=yyymmdd-HHMMSS=${now}=' \
	 -e 's=DEBUG_LOG_CHOOSE=debug_log_real=' \
	  < $< > $@

rgeeoh.js: geeoh-in.js Makefile
	sed \
	 -e 's=yyymmdd-HHMMSS=${now}=' \
	 -e 's=DEBUG_LOG_CHOOSE=debug_log_dummy=' \
	  < $< > $@

tgz: ${TGZ}
${TGZ} : ${SRCS}
	tar czf $@ ${SRCS}
	tar tvzf $@; ls -lG $@

