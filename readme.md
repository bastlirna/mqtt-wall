# MQTT Wall

*Simple web page for show subscribed topics from MQTT server. — Like twitter wall for your MQTT broker.*

<p align="center">
<img src="https://raw.githubusercontent.com/bastlirna/mqtt-wall/master/doc/screenshot.png" alt="MQTT Wall Screenshot">
</p>

## Status

[![Build Status](https://travis-ci.org/bastlirna/mqtt-wall.svg?branch=master)](https://travis-ci.org/bastlirna/mqtt-wall) [![Build list](https://img.shields.io/badge/build-list-lightgray.png)](http://jslab.net/pub/mqtt-wall/) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/c7957e9f6394477cb5d1b13fc66b5561)](https://www.codacy.com/app/horcicaa/mqtt-wall?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=bastlirna/mqtt-wall&amp;utm_campaign=Badge_Grade)

## Main Goal

- Clean and simple design
- Nice on big screen with huge font (overhead projector during lecture)
- Just subscription of single topic (including wildcards ofcourse)

## Demo

You can try **[demo](http://bastlirna.github.io/mqtt-wall/demo/)** using Mosquitto test server (*test.mosquitto.org*).

## Usage

1. Downalod MQTT wall package (**[stable version](https://github.com/bastlirna/mqtt-wall/releases)** or [latest build](http://jslab.net/pub/mqtt-wall/))
2. In index.html file there is configuration, put there your broker connection (MQTT over websockets is required).

## History

This project was created as demo for my talk about MQTT on conference [Linux Days 2015](https://www.linuxdays.cz/2015/en/). First version took me about one hour. Since then codebase was completely rewritten.
