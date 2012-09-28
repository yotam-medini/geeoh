#!/usr/bin/make -f

WTARGET = ${HOME}/public_html/geeoh
BTARGET = ${HOME}/geeoh/bin

BASE=signin

default:
	@echo Please use explicit target
	@false


local-install: \
	${WTARGET}/${BASE}.html \
	${WTARGET}/${BASE}.js \
	${WTARGET}/message.js \
	${WTARGET}/${BASE}.php \
	${WTARGET}/confirm.php \
	${WTARGET}/config.php \

${WTARGET}/${BASE}.html: ${BASE}.html ${MAKEFILE_LIST}
	sed \
	  -e 's=http://ajax.googleapis.com/ajax/libs/=../jq/=g' \
	  < $< > $@

${WTARGET}/%.js: %.js
	cp $< $@

${WTARGET}/%.php: %.php
	cp $< $@

TGZ_FILES = \
	${MAKEFILE_LIST} \
	${BASE}.html \
	message.js \
	${BASE}.js \
	${BASE}.php \
	config.php \
	confirm.php \

TGZ = /tmp/${BASE}.tgz
tgz:
	rm -f ${TGZ}
	tar czf ${TGZ} ${TGZ_FILES}
	tar tvzf ${TGZ}; ls -lG ${TGZ}

ifneq ($(emv),)
emv:
	@echo $($(emv))
endif
