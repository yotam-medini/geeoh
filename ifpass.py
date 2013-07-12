#!/usr/bin/env python
#
# A trivial pre-processor.
# Single pair of directives:
#   #ifpass <string1> ... <stringn>
#     ....
#   #endif
#

import sys


def aget(a, i, defval='-'):
    return a[i] if i < len(a) else defval


def open_defstd(a, i, fdef, mode):
    f = fdef
    fn = aget(a, i)
    if fn != '-':
        f = open(fn, mode)
    return f


class IfPass:
    

    def __init__(self, argv):
        self.rc = 0
        self.argv = argv
        self.verbose = True
        self.fin = None
        self.fout = None
        self.pass_strings = set()
        self.parse_command_line()


    def usage(self, exitcode=0):
        sys.stderr.write(
            "Usage: %s [-q] -D<str1> ... -D<strN> [filein [fileout]]" %
            self.argv[0])
        sys.exit(exitcode)


    def parse_command_line(self):
        ai = 1
        a = self.argv
        more_opts = True
        while self.rc == 0 and more_opts and ai < len(a):
            opt = a[ai]
            if opt in ('-h', '-help', '--help'):
                self.usage(0)
            if opt.startswith("-q"):
                self.verbose = False
            elif opt.startswith("-D"):
                self.pass_strings.add(opt[2:])
            else:
                more_opts = False
            if more_opts:
                ai += 1
        if len(a) - ai > 2:
            self.usage(1)
        self.fin = open_defstd(a, ai, sys.stdin, 'r')
        self.fout = open_defstd(a, ai + 1, sys.stdout, 'w')
        self.vlog("%d pass-strings" % len(self.pass_strings))


    def run(self):
        n_lines = 0
        line = self.fin.readline()
        pass_mode = True
        n_lines_passed = n_ifpass = n_ifpassed = 0
        while line != "":
            if line.startswith("#ifpass"):
                n_ifpass += 1
                if_strings = set(line.split()[1:])
                x = if_strings.intersection(self.pass_strings)
                pass_mode = len(x) > 0
                if pass_mode:
                    n_ifpassed += 1
                self.fout.write("\n")
            elif line.startswith("#endif"):
                pass_mode = True
                self.fout.write("\n")
            else:
                if pass_mode:
                    self.fout.write(line)
                    n_lines_passed += 1
                else:
                    self.fout.write("\n")
            line = self.fin.readline()
            n_lines += 1


        self.fin.close()
        self.fout.close()
        self.vlog("""
Lines:     %4d
Passed:    %4d
#ifpass:   %4d
#ifpassed: %4d
"""[1:] %
             (n_lines, n_lines_passed, n_ifpass, n_ifpassed))


    def vlog(self, msg):
        if self.verbose:
            sys.stderr.write("%s\n" % msg)



p = IfPass(sys.argv)
p.run()
sys.exit(p.rc)
