#!/usr/bin/env python
#
# geeoh IO - Client
# Author:  Yotam Medini  yotam.medini@gmail.com -- Created: 2011/July/04

from http import cookies
import base64
import cgi
import os
import pickle
import simplejson
import socket
import string # for debug?
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
  [-user <name>]         # User signed in (or guest)
  [-mkdir <path>]        # directory to open, must belong to user.
  [-postmap <key:val,]   # command separated key:value pairs
  [-text <str>]          # str of (JSON) string
  [-noheader]            # Suppress response header 
"""[1:] % self.argv[0])
        
        
    def __init__(self, argv, logfn):
        cs.CSBase.__init__(self, argv, logfn)
        self.sprelog = "(%d) " % os.getpid()
        self.log("")
        self.log("argv=%s" % (' '.join(argv)))
        self.portfn = None
        self.user = "guest"
        self.dir2make = None
        self.postmap = None
        self.text = None
        self.output_header = True
        ai = 1
        while ai < len(argv) and self.mayrun():
            opt = argv[ai]
            ai += 1
            if opt in ('-h', '-help', '--help'):
                self.usage()
            elif opt == '-portfn':
                self.portfn = argv[ai]; ai += 1;
            elif opt == '-postmap':
                v_postmap = argv[ai]; ai += 1;
                self.log("v_postmap=%s" % v_postmap)
                self.postmap = dict(
                    map(lambda kv: kv.split(":"), v_postmap.split(",")))
            elif opt == '-text':
                self.text = argv[ai]; ai += 1;
            elif opt == '-user':
                self.user = argv[ai]; ai += 1;
            elif opt == '-mkdir':
                self.dir2make = argv[ai]; ai += 1;
            elif opt == '-noheader':
                self.output_header = False
            else:
                self.error("Unsupported option: '%s'" % opt)
        if self.ok():
            if self.portfn is None:
                self.error("Missing portfn")
        self.jse = simplejson.JSONEncoder(separators=(',',':'))


    def run(self):
        self.log("")
        # os.system("/home/yotam/src/geeoh/session-dump.php");
        self.result = {}
        self.csocket = None
        if self.dir2make or self.postmap is not None:
            self.non_direct_post()
        else:
            self.get_cgi_env()
            if self.method in ("GET", "POST"):
                self.post_handle()
            else:
                self.error("CGI-Method: '%s' not supported" % self.method)
        if self.csocket:
            self.csocket.close()
        self.log("end")

        
    def non_direct_post(self):
        self.get_connect_socket()
        if self.dir2make:
            err = self.mkdir_path(self.dir2make)
        else:
            self.act()
            err = self.result.get('error', None)
        if err:
            sys.stderr.write("%s\n" % err)
            sys.stdout.write("%s\n" % err) # for php's exec()
            self.error()


    def post_handle(self):
        self.log("")
        self.get_connect_socket()
        self.form = form = cgi.FieldStorage()
        self.log("  form=%s" % str(form))
        for item in form.getlist("item"):
            self.log("  item: %s" % str(item))
        action = form.getfirst("action", "")
        self.act()
        if not self.result is None:
            response = self.jse.encode(self.result)
            self.log("  type(response): %s, len=%d %s [?...]" %
                     (type(response), len(response), response[:20]))
            self.cgi_response(response)
            

    def post_value(self, key, defval=""):
        v = (self.form.getfirst(key, defval) 
             if self.postmap is None else
             self.postmap.get(key, defval))
        return v


    def act(self):
        action = self.post_value("action")
        self.log("action=%s" % action)
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

    def refresh(self):
        self.log("")
        upath = self.post_value("path")
        self.log("upath='%s'" % upath)
        self.csend_data("dir")
        self.csend_data(upath)
        dlist = eval( self.recv_data(self.csocket) )
        flist = eval( self.recv_data(self.csocket) )
        self.log("|D|=%d, |F|=%d" % (len(dlist), len(flist)))
        self.result = {'dlist': dlist, 'flist': flist};


    def fput(self):
        self.log("")
        upath = self.post_value("path")
        bfn = self.post_value("fn")
        fn = "%s/%s" % (upath, bfn)
        self.log("fn='%s'" % fn)
        slash_at = fn.find("/")
        if slash_at == -1 or slash_at == len(fn) - 1:
            err = "Cannot save file in top directory"
        elif fn[:slash_at] != self.user:
            err = "Cannot save within other user data"
        else:
            text = self.post_value("text")
            if text == "":
                text = sys.stdin.read();
            dtext = base64.b64decode(text)
            self.log("text[%d]=%s ..., dtext[%d]=%s ..." % 
                     (len(text), text[:0x10], len(dtext), dtext[:0x10]))
            self.csend_data("fput")
            self.csend_data(fn)
            self.csend_data(dtext)
            err = self.recv_data(self.csocket)
        if err:
            self.result['error'] = "Error %s" % err


    def fget(self):
        self.log("")
        upath = self.post_value("path")
        bfn = self.post_value("fn")
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
        err = None
        upath = self.post_value("path")
        bdn = self.post_value("dn")
        dn = "%s/%s" % (upath, bdn) if upath else bdn
        self.log("upath=%s, bdn=%s, dn=%s" % (upath, bdn, dn))
        slash_at = dn.find("/")
        if slash_at == -1 or slash_at == len(dn) - 1:
            err = "Cannot mkdir top directory"
        elif dn[:slash_at] != self.user:
            err = "Cannot mkdir within other user data"
        else:
            err = self.mkdir_path(dn)
        if err:
            self.result['error'] = "Error %s" % err


    def mkdir_path(self, dn):
        self.log("")
        err = None
        self.log("dn='%s'" % (dn))
        if dn == self.user or dn.startswith(self.user + "/"):
            self.csend_data("mkdir")
            self.csend_data(dn)
            err = self.recv_data(self.csocket)
        else:
            err = "Unauthorized: mkdir %s for %s" % (dn, self.user)
        self.log("err=%s" % err)
        return err


    def edel(self):
        self.log("")
        err = None
        upath = self.post_value("path")
        t = self.post_value("t")
        e = self.post_value("e")
        ae = "%s/%s" % (upath, e) if upath else e
        self.log("t=%s, ae='%s" % (t, ae))
        slash_at = ae.find("/")
        if slash_at == -1 or slash_at == len(ae) - 1:
            err = "Cannot delete top directory"
        elif ae[:slash_at] != self.user:
            err = "Cannot delete other user data"
        else:
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
        if 'HTTP_COOKIE' in os.environ.keys():
            cookie = cookies.SimpleCookie()
            cookie.load(os.environ['HTTP_COOKIE'])
            for item in cookie.items():
                self.log("cookie[%s]=%s\n" % item)


    def get_port(self):
        self.log("")
        self.log("portfn=%s" % self.portfn)
        try:
            f = open(self.portfn)
        except Exception as why:
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
            except Exception as why:
                self.error("connect failed, why=%s" % str(why))
                s.close()
                s = None
            self.log(f"get_connect_socket: s={s}")
        self.csocket = s


    def prelog(self):
        return self.sprelog

dn_log = "/tmp/geeoh-ioc"
try:
    os.mkdir(dn_log)
    os.chmod(dn_log, 0o0777)
except:
    pass
# logfn = "%s/%d.log" % (dn_log, os.getpid())
logfn = "%s/last.log" % (dn_log)
p = CGI(sys.argv, logfn)
if p.mayrun():
    p.run()
sys.exit(p.rc)
