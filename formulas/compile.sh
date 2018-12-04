#!/bin/bash

#compile formulas.ms to formulas.pdf
groff -e -ms formulas.ms -T pdf -K utf-8 > formulas.pdf
