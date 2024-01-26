# geeoh-IO - Common base for client and server
# Author:  Yotam Medini  yotam.medini@gmail.com -- Created: 2011/July/06


import os
import socket
import struct
import sys
import traceback
import time


def strnow():
    "Return current time as yyyy/mm/dd:HH:MM:SS"
    now = int(time.time())
    nowlocal = time.localtime(now)
    lta = time.localtime(now)
    s = "%d/%02d/%02d:%02d:%02d:%02d" % lta[0:6]
    return s


def uint32(n):
    if n < 0:
        n += 0x100000000
    return n


def int32(n):
    if n >= 0x80000000:
        n = n - 0x100000000
    return n


def toASCII(s):
    s = "".join(map(lambda c: (" " + c)[ord(c) < 128], s))
    return s


class CSBase:


    def __init__(self, argv, logname):
        sys.stderr.write(f"CSBase: logname={logname}, argv={' '.join(argv)}\n")
        self.argv = argv
        self.rc = 0
        self.helped = False
        self.debug = False
        self.flog = None
        try:
            os.stat("/tmp/geeoh-io.debug")
            self.debug = True
        except Exception as e:
            sys.stderr.write(f"CSBase e={e}\n")
            # pass
        sys.stderr.write(f"CSBase debug={self.debug}\n")
        if self.debug:
            self.flog = open(logname, "a")
            try:
                os.chmod(logname, 0o0666)
            except:
                pass
            self.flog.write("Hello\n")
            self.flog.flush()


    def ok(self):
        return self.rc == 0

    def mayrun(self):
        return self.ok() and not self.helped

    def error(self, msg=None):
        self.log(msg)
        if self.ok():
            self.rc = 1
            if not msg is None:
                sys.stderr.write("%s\n" % msg)
                self.usage()


    def log(self, msg, tb_up=2):
        if self.debug:
            scaller = ""
            tb = traceback.extract_stack()
            if len(tb) >= tb_up:
                e = tb[-tb_up]
                fn = e[0].split("/")[-1]
                scaller = "%s[%s:%d<%s>]" % (self.prelog(), fn, e[1], e[2])
            self.flog.write("%s %s: %s\n" % (strnow(), scaller, msg))
            self.flog.flush()


    def prelog(self):
        return ""

    
    def send_data(self, s, data):
        datalen = len(data)
        self.log("datalen=%d, data=%s" % (datalen, data[:16]))
        self.send_number(s, datalen)
        if datalen > 0:
            pad = (4 - (datalen % 4)) % 4
            data += (pad * chr(0))
            sent = s.send(bytes(data, "utf-8"))
        else:
            sent = 0
        self.log("datalen=%d, sent=%d" % (datalen, sent))


    def recv_data(self, s):
        datalen = self.recv_number(s)
        if datalen > 0:
            pad = (4 - (datalen % 4)) % 4
            bdata =  s.recv(datalen + pad)
            data = bdata.decode("utf-8")
            self.log("pad=%d, padded-data=%s" % (pad, data[:8]))
            if pad > 0:
                data = data[:-pad]
        else:
            data = "";
        self.log("datalen=%d, data=%s..." % (datalen, data[:8]))
        return data


    def send_number(self, s, n):
        n = uint32(n)
        netnum = socket.htonl(n)
        # self.log("n=%d=0x%x, netnum=%d=0x%x" %
        #            (n, n, netnum, netnum))
        sent4 = s.send(struct.pack('I', netnum))
        # self.log("n=%d, sent4=%d" % r(n, sent4))


    def recv_number(self, s):
        b4 = s.recv(4)
        self.log("b4=%s, len=%d" % (str(b4), len(b4)))
        n = 0
        if len(b4) == 4:
            netn = struct.unpack('I', b4)[0]
            n = socket.ntohl(netn)
            n = int32(n)
        s = ("0x%x" % n)
        if n < 0:
            s = ("-0x%x" % (-n))
        # self.log("n=%d=%s" % (n, s))
        return n
