---
title: Adaptive Dashboard
year: 2026
type: HMI concept
role: [UX research, HMI design]
tools: [Figma, Miro]
duration: Concept project
summary: An instrument cluster that shows less as driving gets harder, and warns through one ring that changes colour.
category: HMI
cover: ../../assets/hmi/03-traffic-main.png
coverAlt: The traffic-mode cluster at night, with the speed ring in green, the car ahead and a mini map
coverRatio: 2 / 1
results:
  - Two modes, highway and traffic
  - One ring that warns, green to red
  - Twelve screens, from parked to emergency braking
stats:
  - { value: 4, label: research questions }
  - { value: 7, label: scenarios storyboarded }
  - { value: 12, label: final screens }
blocks:
  - type: cluster
    ratio: 2 / 1
    modes:
      - name: Highway
        steps:
          - { src: ../../assets/hmi/01-startup.png, alt: Startup screen with both gauges at zero and all warning lights on, title: Startup, sensors: Self-check of every system., screen: Both gauges at zero, every tell-tale lit once. }
          - { src: ../../assets/hmi/02-dashboard-main.png, alt: Highway cruise at 94 km/h with speed and rpm gauges and a 120 limit sign, title: Cruise, sensors: Sign recognition and adaptive cruise., screen: "Speed, rpm, the limit and ACC 100. Nothing else." }
          - { src: ../../assets/hmi/04-nav-highway.png, alt: Navigation card reading Exit 12 in 2.4 km keep right, title: Exit guidance, sensors: GPS and lane data., screen: "Exit 12, 2.4 km, keep right, with the lane to take." }
          - { src: ../../assets/hmi/05-blindspot.png, alt: Yellow warning reading Vehicle Detected with the adjacent lane highlighted, title: Blind spot, sensors: Rear radar finds a car alongside., screen: The lane lights up yellow before you move into it. }
          - { src: ../../assets/hmi/12-crash-alert.png, alt: The whole cluster washed red with the words Emergency Braking, title: Emergency braking, sensors: Forward camera and radar predict a collision., screen: The whole cluster turns red. One message. }
      - name: Traffic
        steps:
          - { src: ../../assets/hmi/03-traffic-main.png, alt: Traffic mode with the rpm gauge removed and a green speed ring, title: Traffic mode, sensors: "360° proximity on.", screen: "The rpm gauge goes. Map, range and a green ring stay." }
          - { src: ../../assets/hmi/06-blindspot-traffic.png, alt: Speed ring turned yellow with a car behind on the left, title: Car alongside, sensors: Side sensors track a car close behind., screen: The ring turns yellow. }
          - { src: ../../assets/hmi/07-proximity-warning.png, alt: Speed ring turned orange with cars close on every side, title: Closing in, sensors: Gaps shrinking on several sides., screen: Ring and halo turn orange. }
          - { src: ../../assets/hmi/08-proximity-alert.png, alt: Red ring and a red lane with a warning sign as a car cuts in, title: Cut-in, sensors: A car enters your lane., screen: "Red ring, red lane, WARNING." }
          - { src: ../../assets/hmi/09-proximity-alert-2.png, alt: Pedestrian Detected warning with a red cone ahead of the car, title: Pedestrian, sensors: Camera classifies a person crossing., screen: Pedestrian Detected and a red cone ahead. }
      - name: Parking
        steps:
          - { src: ../../assets/hmi/10-park-auto.png, alt: A free space highlighted green beside the car with a Confirm OK prompt, title: Auto park, sensors: Ultrasonics find a free space., screen: "The space glows green. One tap: Confirm, OK." }
          - { src: ../../assets/hmi/11-parking-manual.png, alt: Rear camera view with guide lines next to a top-down car with sensor arcs, title: Manual park, sensors: Rear camera and twelve sensors., screen: "Camera, guide lines and arcs that go green, amber, red." }
process:
  - phase: Define
    title: Too much on one screen
    points:
      - Drivers need speed, navigation and safety cues at a glance.
      - Clutter and deep menus pull eyes off the road.
      - "The question: can the cluster show less, at the right time?"
  - phase: Discover
    title: Four questions, one wall
    points:
      - What matters most while driving?
      - How does that change with the road?
      - What distracts, and what would help?
    media: ../../assets/hmi/research.jpg
    alt: Miro wall of sticky notes grouped under four research questions, with highway and traffic clusters and the brief
  - phase: Decide
    title: Two modes, not one dashboard
    points:
      - "Highway: speed, range, exit guidance, blind spot, fatigue."
      - "Traffic: 360° proximity, pedestrians, parking, the next turn."
      - Anything the moment doesn't need, hidden.
  - phase: Imagine
    title: Seven moments, storyboarded
    points:
      - Blind spot, fatigue, exit, speed breaker, pedestrian, motorcycle, parking.
      - Each told in six shots, from calm to safe.
    media: ../../assets/hmi/storyboards.jpg
    alt: Seven six-shot storyboards for the highway and traffic scenarios
  - phase: Map
    title: What the car senses, what you see
    points:
      - A flow for every scenario, from sensor to screen.
      - Decision points decide when a warning becomes an alert.
    media: ../../assets/hmi/flows.jpg
    alt: User and system flowcharts for lane change, speed breaker and traffic mode
  - phase: Sketch
    title: Layouts on paper first
    points:
      - Three traffic and three highway layouts.
      - Four revised variations, one picked to build.
    media: ../../assets/hmi/sketches.jpg
    alt: Four hand-drawn cluster layouts with speed, rpm, range and status bars
  - phase: Test
    title: Toy cars on a paper road
    points:
      - Every scenario acted out with model cars.
      - Lanes and warnings drawn where the screen would show them.
    media: ../../assets/hmi/prototype.jpg
    alt: Model cars on paper roads with drawn lanes, sensor arcs and parking guides
  - phase: Build
    title: One ring that warns
    points:
      - Green, yellow, orange, red. Felt before it is read.
      - Twelve screens in Figma, from startup to emergency braking.
    gallery:
      - { src: ../../assets/hmi/03-traffic-main.png, alt: Green ring, all clear }
      - { src: ../../assets/hmi/06-blindspot-traffic.png, alt: Yellow ring, a car alongside }
      - { src: ../../assets/hmi/07-proximity-warning.png, alt: Orange ring, cars closing in }
      - { src: ../../assets/hmi/08-proximity-alert.png, alt: Red ring, a car cutting in }
featured: true
order: 2
---

## Overview
- A concept instrument cluster that adapts to the road.
- Concept work; not affiliated with Porsche.

## Problem
- Too much information, too many notifications, small targets and text.
- Important alerts get buried; drivers look away to find things.

## Research
- Four questions, answered on a Miro wall.
- Core needs: speed, navigation, blind spot, range.
- Context changes priority: navigation in new places, parking in tight spaces, speed on highways, ADAS at night.

## Design principles
- Context first, progressive disclosure, large type and targets.
- Safety alerts ranked above everything; minimal motion.

## What's next
- Fatigue alert, speed-breaker lift and motorcycle warning screens.
- Sound and haptic cues to pair with each alert level.
- Testing with drivers in a simulator.
