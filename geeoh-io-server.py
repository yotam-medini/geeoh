#!/usr/bin/env python
# 4tri game - server
# Author:  Yotam Medini  yotam.medini@gmail.com -- Created: 2011/July/03


import StringIO
import os
import pickle
import random
import socket
import stat
import sys
import time

# local
import cs


class Server(cs.CSBase):

    default_prefix = os.getenv("HOME") + "/geeoh";

    def usage(self):
        self.helped = True
        sys.stderr.write(
"""
Usage:                   # [Default]
  %s
  [-h | -help | --help]  # This message
  -prefix <dir>          # [%s] Directory for running
"""[1:] %
            (self.argv[0], self.__class__.default_prefix))


    def __init__(self, argv):
        cs.CSBase.__init__(self, argv, "/tmp/geeoh-io-server.log")
        self.log("")
        self.argv = argv

        self.prefix = self.__class__.default_prefix
        ai = 1
        while ai < len(argv) and self.mayrun():
            opt = argv[ai]
            ai += 1
            if opt in ('-h', '-help', '--help'):
                self.usage()
            elif opt == '-prefix':
                self.prefix = argv[ai]; ai += 1;
            else:
                self.error("Unsupported option: '%s'" % opt)
        if self.mayrun():
            self.portfn = "%s/var/geeohio.port" % self.prefix
            self.pidfn = "%s/var/geeohio.pid" % self.prefix
            self.udir = "%s/users" % self.prefix


    def run(self):
        self.log("")
        if self.pidfn is not None:
            f = open(self.pidfn, "w")
            f.write("%d\n" % os.getpid())
            f.close()
        s = self.socket_init()
        s.listen(5)
        while True:
            client, addr = s.accept()
            self.log("accept: address=%s" % str(addr))
            cmd = self.recv_data(client)
            self.log("cmd='%s'" % str(cmd))
            if cmd == "dir":
                self.dirlist(client)
            elif cmd == "fput":
                self.fput(client)
            elif cmd == "fget":
                self.fget(client)
            elif cmd == "mkdir":
                self.mkdir(client)
            else:
                self.log("Bad command: %s" % cmd)
            self.log("Client served")
        self.log("end")


    def dirlist(self, client):
        self.log("");
        upath = self.recv_data(client)
        self.log("path='%s'" % upath)
        dn = self.udir
        dlist = []
        flist = []
        if upath:
            dn += "/" + upath
            dlist.append("..");
        self.log("abspath=%s" % dn)
        try:
            entries = os.listdir(dn)
        except:
            entries = [];
        entries.sort()
        for e in entries:
            s = os.stat("%s/%s" % (dn, e))
            if stat.S_ISDIR(s[stat.ST_MODE]):
                dlist.append(e)
            elif stat.S_ISREG(s[stat.ST_MODE]):
                flist.append((e, s[stat.ST_SIZE], s[stat.ST_MTIME]))
        self.log("|D|=%d, |F|=%d" % (len(dlist), len(flist)))
        self.send_data(client, repr(dlist))
        self.send_data(client, repr(flist))


    def fput(self, client):
        self.log("");
        fn = self.recv_data(client)
        text = self.recv_data(client)
        self.log("fn=%s, |text|=%d, text=%s ..." %
                 (fn, len(text), text[:0x10]))
        afn = "%s/%s" % (self.udir, fn);
        err = "";
        try:
            f = open(afn, "w");
        except Exception, why:
            self.log("afn=%s, why: %s" % (afn, why))
            err = "Failed to open %s" % fn
            f = None
        if f:
            f.write(text)
            f.close()
        self.send_data(client, err)


    def fget(self, client):
        self.log("");
        fn = self.recv_data(client)
        self.log("fn=%s" % fn)
        afn = "%s/%s" % (self.udir, fn);
        err = "";
        try:
            f = open(afn, "r");
        except Exception, why:
            self.log("afn=%s, why: %s" % (afn, why))
            err = "Failed to open %s" % fn
            f = None
        if f:
            text = f.read()
            f.close()
        self.send_data(client, err)
        if not err:
            self.send_data(client, text)
            

    def mkdir(self, client):
        self.log("");
        dn = self.recv_data(client)
        adn = "%s/%s" % (self.udir, dn);
        self.log("adn=%s" % adn)
        err = ""
        try:
            os.mkdir(adn, 0755)
        except Exception, why:
            self.log("dn=%s, why: %s" % (adn, why))
            err = "Failed to mkdir %s" % dn
        self.send_data(client, err)


    def socket_init(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM, 0)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(('127.0.0.1', 0))
        self.port = s.getsockname()[1]
        self.log("port=%d" % self.port)
        f = open(self.portfn, "w")
        f.write("%d\n" % self.port)
        f.close()
        return s


if __name__ == "__main__":
    p = Server(sys.argv)
    if p.mayrun():
        p.run()
    sys.exit(p.rc)
