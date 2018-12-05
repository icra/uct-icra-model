#!/bin/bash

#compile formulas.ms to formulas.pdf
groff -t -e -ms formulas.ms -T pdf -K utf-8 > formulas.pdf
