import * as d3 from 'd3';

export default class Chart {
    constructor(canvasWidth, scaleValue) {
        this.rectangleSize = 64;
        this.canvasWidth = canvasWidth;
        this.scaleValue = scaleValue;
        this.canvasHeight = this.rectangleSize * scaleValue;

        this.canvasSVG = d3.select("svg")
            .attr("viewBox", [0, 0, this.canvasWidth, this.canvasHeight])
            .attr("width", canvasWidth)
            .attr("height", this.canvasHeight)
            .attr("style", "max-width: 100%; height: auto;");
    }

    erase() {
        this.canvasSVG.interrupt();
        this.canvasSVG.selectAll("*").remove();
    }

    analyze(d) {
        const transformedData = Array.from(this.countries, (country) => ({
            name: country,
            value: d(country)
        }));

        transformedData.sort((a, b) => d3.descending(a.value, b.value));

        for (let i = 0; i < transformedData.length; ++i) {
            transformedData[i].rank = i;
        }

        return transformedData;
    }

    populate(data) {
        const countryList = [...new Set(data.map(item => item.name))];
        this.countries = countryList;

        const coloring = {}
        countryList.forEach((item, index) => {
            let hue = (index * 360 / countryList.length) % 360;
            let saturation = 0.7;
            let lightness = 0.6;
            let color = d3.hsl(hue, saturation, lightness);

            coloring[item] = color.toString();
        });

        this.countryColors = coloring;

        const xAxis = d3.scaleLinear()
            .domain([0, 1])
            .range([0, this.canvasWidth]);

        const yAxis = d3.scaleBand()
            .domain(d3.range(this.scaleValue + 1))
            .rangeRound([0, this.rectangleSize * (this.scaleValue + 1 + 0.1)])
            .padding(0.1);

        this.horizontalScale = xAxis;
        this.verticalScale = yAxis;
        this.dataSet = data;
    }

    outlineFrames() {
        const yearValues = Array.from(
            d3.rollup(this.dataSet, ([d]) => d.value, d => +d.year, d => d.name)
        ).sort(([a], [b]) => d3.ascending(a, b));

        const keyframes = [];
        let startYear, startValues, endYear, endValues;
        const interpolationFactor = 10;

        for ([[startYear, startValues], [endYear, endValues]] of d3.pairs(yearValues)) {
            for (let i = 0; i < interpolationFactor; ++i) {
                const t = i / interpolationFactor;
                const interpolatedValues = {};

                for (const name of startValues.keys()) {
                    const startValue = startValues.get(name) || 0;
                    const endValue = endValues.get(name) || 0;
                    interpolatedValues[name] = startValue * (1 - t) + endValue * t;
                }

                keyframes.push([startYear, this.analyze(name => interpolatedValues[name])]);
            }
        }

        keyframes.push([endYear, this.analyze(name => endValues.get(name) || 0)]);


        this.keyframesSet = keyframes;

        this.renamedFrames = d3.groups(
            keyframes.flatMap(([, renamed]) => renamed),
            d => d.name
        );

        this.previousData = new Map(
            this.renamedFrames.flatMap(([, renamed]) =>
                d3.pairs(renamed, (a, b) => [b, a])
            )
        );

        this.nextData = new Map(
            this.renamedFrames.flatMap(([, renamed]) =>
                d3.pairs(renamed)
            )
        );
    }

    generateTickers() {
        const presentDate = this.canvasSVG.append("text")
            .style("font", `bold ${this.rectangleSize}px "Jetbrains Mono"`)
            .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")
            .attr("x", this.canvasWidth - 6)
            .attr("y",  this.rectangleSize * (this.scaleValue - 0.45))
            .attr("dy", "0.32em")
            .text(this.keyframesSet[0][0]);

        return ([year], transition) => {
            transition.end().then(() => presentDate.text(year));
        };
    }

    interpolateText(a, b) {
        const interpolate = d3.interpolateNumber(a, b);
        return function (t) {
            this.textContent = interpolate(t).toFixed(2);
        }
    }

    displayLabels() {
        let label = this.canvasSVG.append("g")
            .style("font", `bold 12px "Jetbrains Mono"`)
            .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")
            .selectAll("text");

        return ([date, data], transition) => label = label
            .data(data.slice(0, this.scaleValue), d => d.name)
            .join(
                enter => enter.append("text")
                    .attr("transform", d => `translate(${this.horizontalScale((this.previousData.get(d) || d).value)},${this.verticalScale((this.previousData.get(d) || d).rank)})`)
                    .attr("y", this.verticalScale.bandwidth() / 2)
                    .attr("x", -6)
                    .attr("dy", "-0.25em")
                    .text(d => d.name)
                    .call(text => text.append("tspan")
                        .attr("fill-opacity", 0.7)
                        .attr("font-weight", "normal")
                        .attr("x", -6)
                        .attr("dy", "1.15em")),
                update => update,
                exit => exit.transition(transition).remove()
                    .attr("transform", d => `translate(${this.horizontalScale((this.nextData.get(d) || d).value)},${this.verticalScale((this.nextData.get(d) || d).rank)})`)
                    .call(g => g.select("tspan").tween("text", d => this.interpolateText(d.value, (this.nextData.get(d) || d).value)))
            )
            .call(bar => bar.transition(transition)
                .attr("transform", d => `translate(${this.horizontalScale(d.value)},${this.verticalScale(d.rank)})`)
                .call(g => g.select("tspan").tween("text", d => this.interpolateText((this.previousData.get(d) || d).value, d.value))));
    }

    constructBars() {
        let bar = this.canvasSVG.append("g")
            .attr("fill-opacity", 0.6)
            .selectAll("rect");

        return ([_, data], transition) => {
            return bar = bar
                .data(data.slice(0, this.scaleValue), d => d.name)
                .join(
                    enter => enter.append("rect")
                        .attr("fill", d => this.countryColors[d.name])
                        .attr("height", this.verticalScale.bandwidth())
                        .attr("x", this.horizontalScale(0))
                        .attr("y", d => this.verticalScale((this.previousData.get(d) || d).rank))
                        .attr("width", d => this.horizontalScale((this.previousData.get(d) || d).value) - this.horizontalScale(0)),
                    update => update,
                    exit => exit.transition(transition).remove()
                        .attr("y", d => this.verticalScale((this.nextData.get(d) || d).rank))
                        .attr("width", d => this.horizontalScale((this.nextData.get(d) || d).value) - this.horizontalScale(0))
                )
                .call(bar => bar.transition(transition)
                    .attr("y", d => this.verticalScale(d.rank))
                    .attr("width", d => this.horizontalScale(d.value) - this.horizontalScale(0)));
        }
    }

    async animateFrames(onFrame) {
        const updateHorizontalAxis = this.constructBars();
        const updateLabels = this.displayLabels();
        const updateTicker = this.generateTickers();

        for (const keyframe of this.keyframesSet) {
            const transition = this.canvasSVG.transition()
                .duration(500)
                .ease(d3.easeLinear);

            this.horizontalScale.domain([0, keyframe[1][0].value]);

            [updateHorizontalAxis, updateLabels, updateTicker].forEach(func => func(keyframe, transition));

            await transition.end();

            onFrame(keyframe);
        }
    }
}
