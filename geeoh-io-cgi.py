#!/usr/bin/env python
#
# geeoh IO - CGI
# Author:  Yotam Medini  yotam.medini@gmail.com -- Created: 2011/July/04

import Cookie
import StringIO
import cgi
import os
import pickle
import simplejson
import socket
import sys

# local
import cs


class CGI(cs.CSBase):

    def usage(self):
        self.helped = True
        sys.stderr.write(
"""
Usage:                   # [Default]
  %s
  [-h | -help | --help]  # This message
  -portfn <fn>           # file with listening port
"""[1:] % self.argv[0])
        
        
    def __init__(self, argv, logfn):
        cs.CSBase.__init__(self, argv, logfn)
        self.sprelog = "(%d) " % os.getpid()
        self.log("")
        self.portfn = None
        ai = 1
        while ai < len(argv) and self.mayrun():
            opt = argv[ai]
            ai += 1
            if opt in ('-h', '-help', '--help'):
                self.usage()
            elif opt == '-portfn':
                self.portfn = argv[ai]; ai += 1;
            else:
                self.error("Unsupported option: '%s'" % opt)
        if self.ok():
            if self.portfn is None:
                self.error("Missing portfn")
        self.jse = simplejson.JSONEncoder(separators=(',',':'))


    def run(self):
        self.log("")
        self.get_cgi_env()
        if self.method == "POST":
            self.post_handle()
        else:
            self.error("CGI-Method: '%s' not supported" % self.method)
        self.log("end")

        
    def post_handle(self):
        self.log("")
        self.get_connect_socket()
        self.form = form = cgi.FieldStorage()
        self.log("  form=%s" % str(form))
        for item in form.getlist("item"):
            self.log("  item: %s" % str(item))
        action = form.getfirst("action", "")
        self.log("action=%s" % action)
        self.result = {}
        if action == "refresh":
            self.refresh();
        elif action == "fput":
            self.fput();
        elif action == "fget":
            self.fget();
        elif action == "mkdir":
            self.mkdir();
        elif action == "del":
            self.edel();
        else:
            self.log("Unsupported action: '%s'" % action)
            self.result = {'error': "Bad action: %s" % action}
        if not self.result is None:
            response = self.jse.encode(self.result)
            self.log("  type(response): %s, len=%d %s [?...]" %
                     (type(response), len(response), response[:20]))
            self.cgi_response(response)
            

    def refresh(self):
        self.log("")
        upath = self.form.getfirst("path", "")
        self.log("upath='%s'" % upath)
        self.csend_data("dir")
        self.csend_data(upath)
        dlist = eval( self.recv_data(self.csocket) )
        flist = eval( self.recv_data(self.csocket) )
        self.log("|D|=%d, |F|=%d" % (len(dlist), len(flist)))
        self.result = {'dlist': dlist, 'flist': flist};


    def fput(self):
        self.log("")
        upath = self.form.getfirst("path", "")
        bfn = self.form.getfirst("fn", "")
        text = self.form.getfirst("text", "")
        fn = "%s/%s" % (upath, bfn)
        self.log("fn='%s', text[%d]=%s ..." % (fn, len(text), text[:0x10]))
        self.csend_data("fput")
        self.csend_data(fn)
        self.csend_data(text)
        err = self.recv_data(self.csocket)
        if err:
            self.result['error'] = "Error %s" % err


    def fget(self):
        self.log("")
        upath = self.form.getfirst("path", "")
        bfn = self.form.getfirst("fn", "")
        fn = "%s/%s" % (upath, bfn) if upath else bfn
        self.log("fn='%s'" % fn)
        self.csend_data("fget")
        self.csend_data(fn)
        err = self.recv_data(self.csocket)
        if err:
            self.result['error'] = "Error %s" % err
        else:
            text = self.recv_data(self.csocket)
            self.result['text'] = text


    def mkdir(self):
        self.log("")
        upath = self.form.getfirst("path", "")
        bdn = self.form.getfirst("dn", "")
        dn = "%s/%s" % (upath, bdn) if upath else bdn
        self.log("dn='%s" % (dn))
        self.csend_data("mkdir")
        self.csend_data(dn)
        err = self.recv_data(self.csocket)
        if err:
            self.result['error'] = "Error %s" % err


    def edel(self):
        self.log("")
        upath = self.form.getfirst("path", "")
        t = self.form.getfirst("t", "")
        e = self.form.getfirst("e", "")
        ae = "%s/%s" % (upath, e) if upath else e
        self.log("t=%s, ae='%s" % (t, ae))
        self.csend_data("del")
        self.csend_data(t)
        self.csend_data(ae)
        err = self.recv_data(self.csocket)
        if err:
            self.result['error'] = "Error %s" % err


    def cgi_response(self, response):
        # self.log("session=%d" % self.session)
        self.log("")
        sys.stdout.write('Content-type: text/plain; charset="UTF-8"\n')
        sys.stdout.write("Content-length: %d\n" % len(response))
        sys.stdout.write("\n")
        sys.stdout.write("%s\n" % str(response))


    def csend_data(self, data):
        self.send_data(self.csocket, data);


    def get_cgi_env(self):
        self.log("")
        self.remote_addr = os.environ.get('REMOTE_ADDR', None)
        self.method = os.environ.get('REQUEST_METHOD', None)
        self.log("remote_eaddr=%s, method=%s" %
                    (self.remote_addr, self.method))
        if os.environ.has_key('HTTP_COOKIE'):
            cookie = Cookie.SimpleCookie()
            cookie.load(os.environ['HTTP_COOKIE'])
            for item in cookie.items():
                self.log("cookie[%s]=%s\n" % item)


    def get_port(self):
        self.log("")
        self.log("portfn=%s" % self.portfn)
        try:
            f = open(self.portfn)
        except Exception, why:
            self.error("open(%s): %s" % (self.portfn, why))
            f = None
        if f:
            self.port_server = int(f.readline())
            f.close()
            self.log("port_server=%d" % self.port_server)


    def get_connect_socket(self):
        self.log("")
        self.get_port()
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        if s is None:
            self.error("Failed to open socket")
        if self.ok():
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.connect(('', self.port_server))
            except Exception, why:
                self.error("connect failed, why=%s" % str(why))
                s.close()
                s = None
        self.csocket = s


    def prelog(self):
        return self.sprelog

dn_log = "/tmp/geeoh-ioc"
try:
    os.mkdir(dn_log)
    os.chmod(dn_log, 0777)
except:
    pass
# logfn = "%s/%d.log" % (dn_log, os.getpid())
logfn = "%s/last.log" % (dn_log)
p = CGI(sys.argv, logfn)
if p.mayrun():
    p.run()
sys.exit(p.rc)
