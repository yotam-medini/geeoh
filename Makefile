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
	geeoh.js \
	geeoh-io.js \
	message.js \
	signin.js \
	signin.php \
	confirm.php \
	config-template.php

SRCS += fslocal.html fslocal.js

# geeoh.js debug.js - are exceptions
INSTALLED_JSS = \
	geeoh-io.js \
	message.js \
	signin.js \

INSTALLED_JSS_SPECIAL = \
	geeoh.js \
	debug.js

INSTALLED_CSSS = \
	geeoh.css \
	geeoh-io.css \

INSTALLED_JSS_CSSS = $(INSTALLED_JSS) $(INSTALLED_CSSS)
INSTALLED_JSS_CSSS_ALL = $(INSTALLED_JSS_CSSS) $(INSTALLED_JSS_SPECIAL)

COMPRESSED_JSS_CSSS = \
    $(foreach f, $(INSTALLED_JSS_CSSS), compressed/$(f))
COMPRESSED_JSS_CSSS_ALL = \
    $(foreach f, $(INSTALLED_JSS_CSSS_ALL), compressed/$(f))
W_INST_JSS_CSSS = $(foreach f, $(INSTALLED_JSS_CSSS), $(WTARGET)/$(f))
W_INST_JSS_CSSS_ALL = $(foreach f, $(INSTALLED_JSS_CSSS_ALL), $(WTARGET)/$(f))
INST_KEYPAD = \
	jquery.keypad.min.js \
	jquery.keypad.css
INST_BASE64 = jquery.base64.min.js
INST_ASIS = ${INST_KEYPAD} ${INST_BASE64}
W_INST_ASIS = $(foreach f, $(INST_ASIS), $(WTARGET)/$(f))

INSTALLED_PY_PKGS = \
	cs.py
INSTALLED_PY_EXECS = \
	geeoh-io-client.py \
	geeoh-io-server.py \
	watchdog.py
INSTALLED_PYS = ${INSTALLED_PY_PKGS} ${INSTALLED_PY_EXECS}
B_INST_PY_PKGS = $(foreach f, $(INSTALLED_PY_PKGS), $(BTARGET)/$(f))
B_INST_PY_EXECS = $(foreach f, $(INSTALLED_PY_EXECS), $(BTARGET)/$(f))
B_INST_PYS = ${B_INST_PY_PKGS} ${B_INST_PY_EXECS}

RELFILES = \
	Makefile \
	geeoh.html \
	${INSTALLED_JSS_CSSS_ALL} \
	geeoh-io.cgi \
	${INSTALLED_PYS} \
	${COMPRESSED_JSS_CSSS_ALL} \
	${INST_KEYPAD} \
	confirm.php \
	signin.php

TGZDIR = /tmp
TGZ = ${TGZDIR}/geeoh.tgz
RTGZ = geeoh-rel.tgz

default:
	@echo Please use explicit target
	@false

install: \
	${WTARGET}/geeoh.php \
	${WTARGET}/index.php \
	${WTARGET}/geeoh.js \
	${WTARGET}/debug.js \
	${W_INST_JSS_CSSS} \
	${W_INST_ASIS} \
	${WTARGET}/jquery.keypad.min.js \
	${WTARGET}/jquery.keypad.css \
	${WTARGET}/cgi-bin/geeoh-io.cgi \
	${WTARGET}/signin.php \
	${WTARGET}/confirm.php \
	${WTARGET}/config.php \
	${B_INST_PYS} \

ifeq ($(LOCAL),1)
 DEBUG=1
 define YUI_CP
  cp $(1) $(2)
 endef
else
 define YUI_CP
  yui-compressor --preserve-semi -o $(2) $(1)
 endef
endif

${WTARGET}/geeoh.php: geeoh.html Makefile
	@mkdir -p $(@D)
ifeq ($(LOCAL),1)
	sed \
	  -e 's=http://ajax.googleapis.com/ajax/libs/=../jq/=g' \
	  < $< > $@
else
	cp $< $@
endif

${WTARGET}/index.php: Makefile
	rm -f $@
	ln -s geeoh.php $@


${W_INST_JSS_CSSS_ALL}: ${WTARGET}/%: compressed/%
	@mkdir -p $(@D)
	cp $< $@

${COMPRESSED_JSS_CSSS}: compressed/%: %
	@mkdir -p $(@D)
	$(call YUI_CP,$<,$@)

compressed/geeoh.js: geeoh.js Makefile
	@mkdir -p $(@D)
ifeq ($(LOCAL),1)
	sed -e 's=yyymmdd-HHMMSS=${now}=' < $< > $@
else
	sed -e 's=yyymmdd-HHMMSS=${now}=' < $< | \
	yui-compressor --preserve-semi --type js > $@
endif

compressed/debug.js: debug.js Makefile
	@mkdir -p $(@D)
ifeq ($(DEBUG),1)
	sed -e 's=DEBUG_LOG_CHOOSE=debug_log_real='  < $< > $@
else
	sed -e 's=DEBUG_LOG_CHOOSE=debug_log_dummy='  < $< | \
	yui-compressor --preserve-semi --type js > $@
endif

${W_INST_ASIS}: ${WTARGET}/%: %
	cp $< $@

${WTARGET}/cgi-bin/%.cgi: %.cgi
	@mkdir -p $(@D)
	cp $< $@
	chmod +x $@

${WTARGET}/%.php: %.php
	@mkdir -p $(@D)
	cp $< $@


${B_INST_PY_PKGS}: ${BTARGET}/%: %
	@mkdir -p $(@D)
	cp $< $@

${B_INST_PY_EXECS}: ${BTARGET}/%: %
	@mkdir -p $(@D)
	cp $< $@
	chmod +x $@

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
