# 

ifneq ($(emv),)
emv:
	@echo $($(emv))
endif

WTARGET = ${HOME}/public_html/geeoh
UTARGET = ${HOME}/geeoh
BTARGET = ${UTARGET}/bin

# LOCAL=1 means getting public plugins (jQuery) locally, 
# but also debug and no yui-compactification
LOCAL=

nowymdhm := $(shell date --utc "+%Y-%m-%d-%H%M")
tnow := $(shell date --utc "+%Y-%m-%d-%H%M%S")
now = ${tnow} utc

SRCS = \
	Makefile \
	debug.js \
	geeoh.html \
	geeoh.css \
	geeoh-in.js \
	geeoh-io.js \
	message.js \
	signin.js \
	signin.php \
	confirm.php \
	config.php \

SRCS += fslocal.html fslocal.js

# geeoh.js debug.js - are exceptions
INSTALLED_JSS = \
	geeoh-io.js \
	message.js \
	signin.js \

INSTALLED_CSSS = \
	geeoh.css \

INSTALLED_JSS_CSSS = $(INSTALLED_JSS) $(INSTALLED_CSSS)
W_INST_JSS_CSSS = $(foreach f, $(INSTALLED_JSS_CSSS), $(WTARGET)/$(f))
INST_KEYPAD = \
	jquery.keypad.min.js \
	jquery.keypad.css
W_INST_KEYPAD = $(foreach f, $(INST_KEYPAD), $(WTARGET)/$(f))

INSTALLED_PYS = \
	cs.py \
	geeoh-io-cgi.py \
	geeoh-io-server.py
B_INST_PYS = $(foreach f, $(INSTALLED_PYS), $(BTARGET)/$(f))

RELFILES = \
	geeoh.html \
	geeoh.css \
	geeoh.js \

TGZDIR = /tmp
TGZ = ${TGZDIR}/geeoh.tgz
RTGZ = geeoh-rel.tgz

default:
	@echo Please use explicit target
	@false

install: \
	${WTARGET}/geeoh.html \
	${WTARGET}/geeoh.js \
	${WTARGET}/debug.js \
	${W_INST_JSS_CSSS} \
	${W_INST_KEYPAD} \
	${WTARGET}/jquery.keypad.min.js \
	${WTARGET}/jquery.keypad.css \
	${WTARGET}/cgi-bin/geeoh-io.cgi \
	${B_INST_PYS} \

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

${WTARGET}/geeoh.html: geeoh.html Makefile
ifeq ($(LOCAL),1)
	sed \
	  -e 's=http://ajax.googleapis.com/ajax/libs/=../jq/=g' \
	  < $< > $@
else
	cp $< @$
endif


ifeq ($(LOCAL),1)
 define YUI_CP
  cp $(1) $(2)
 endef
else
 define YUI_CP
  yui-compressor --preserve-semi -o $(2) $(1)
 endef
endif

${W_INST_JSS_CSSS}: ${WTARGET}/%: %
	$(call YUI_CP,$<,$@)

$(WTARGET)/geeoh.js: geeoh-0.js
	$(call YUI_CP,$<,$@)

$(WTARGET)/debug.js: debug.js Makefile
ifeq ($(LOCAL),1)
	sed -e 's=DEBUG_LOG_CHOOSE=debug_log_real='  < $< > $@
else
	sed -e 's=DEBUG_LOG_CHOOSE=debug_log_dummy='  < $< | \
	yui-compressor --preserve-semi --type js > $@
endif

${W_INST_KEYPAD}: ${WTARGET}/%: %
	cp $< $@

${WTARGET}/cgi-bin/%.cgi: %.cgi
	@mkdir -p $(@D)
	cp $< $@


${B_INST_PYS}: ${BTARGET}/%: %
	cp $< $@

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
