# 

ifneq ($(emv),)
emv:
	@echo $($(emv))
endif

nowymdhm := $(shell date --utc "+%Y-%m-%d-%H%M")
tnow := $(shell date --utc "+%Y-%m-%d-%H%M%S")
now = ${tnow} utc

SRCS = \
	Makefile \
	geeoh.html \
	geeoh.css \
	geeoh-in.js \

SRCS += fslocal.html fslocal.js

RELFILES = \
	geeoh.html \
	geeoh.css \
	geeoh.js \

TGZDIR = /tmp
TGZ = ${TGZDIR}/geeoh.tgz
RTGZ = geeoh-rel.tgz


lgeeoh.html: Makefile geeoh.html
	sed \
	  -e 's=http://ajax.googleapis.com/ajax/libs/=jq/=g' \
	  -e 's=geeoh.js=lgeeoh.js=' \
	  < geeoh.html > $@

lgeeoh.js: geeoh-in.js Makefile
	sed \
	 -e 's=yyymmdd-HHMMSS=${now}=' \
	 -e 's=DEBUG_LOG_CHOOSE=debug_log_real=' \
	  < $< > $@

local: lgeeoh.html lgeeoh.js

geeoh-0.js: geeoh-in.js Makefile
	sed \
	 -e 's=yyymmdd-HHMMSS=${now}=' \
	 -e 's=DEBUG_LOG_CHOOSE=debug_log_dummy=' \
	  < $< > $@

geeoh.js: geeoh-0.js
	  yui-compressor --preserve-semi -o $@ $<

tgz: ${TGZ}
${TGZ} : ${SRCS}
	tar czf $@ ${SRCS}
	tar tvzf $@; ls -lG $@

geeoh-rel: ${RTGZ}
${RTGZ} : ${RELFILES}
	tar czf $@ ${RELFILES}
	tar tvzf $@; ls -lG $@

TBZ2 = /tmp/geeoh-${nowymdhm}.tbz2
hg-tbz: ${TBZ2}

${TBZ2}:
	hg archive $@
	tar tvjf $@; ls -lG $@
