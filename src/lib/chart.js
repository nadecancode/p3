import * as d3 from 'd3';

export default class Chart {
    constructor(width, k) {
        this.barSize = 64;
        this.width = width;
        this.k = k;
        this.height = this.barSize * k;

        this.svg = d3.select("svg")
            .attr("viewBox", [0, 0, this.width, this.height])
            .attr("width", width)
            .attr("height", this.height)
            .attr("style", "max-width: 100%; height: auto;");
    }

    reset() {
        this.svg.interrupt();
        this.svg.selectAll("*").remove();
    }

    rank(d) {
        const processedData = Array.from(this.countries, (country) => ({
            name: country,
            value: d(country)
        }));

        processedData.sort((a, b) => d3.descending(a.value, b.value));

        for (let i = 0; i < processedData.length; ++i) {
            processedData[i].rank = Math.min(this.k, i);
        }

        return processedData;
    }

    load(data) {
        const countries = [...new Set(data.map(item => item.name))];
        this.countries = countries;

        const colors = {}
        countries.forEach((item, index) => {
            let hue = (index * 360 / countries.length) % 360;
            let saturation = 0.7;
            let lightness = 0.6;
            let color = d3.hsl(hue, saturation, lightness);

            colors[item] = color.toString();
        });

        this.colors = colors;

        const xScale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, this.width]);

        const yScale = d3.scaleBand()
            .domain(d3.range(this.k + 1))
            .rangeRound([0, this.barSize * (this.k + 1 + 0.1)])
            .padding(0.1);

        this.x = xScale;
        this.y = yScale;
        this.data = data;
    }

    createFrames() {
        const yearvals = Array.from(d3.rollup(this.data, ([d]) => d.value, d => +d.year, d => d.name))
            .sort(([a], [b]) => d3.ascending(a, b));

        const keyframes = [];
        let ka, a, kb, b;
        const interpolationFactor = 10;

        for ([[ka, a], [kb, b]] of d3.pairs(yearvals)) {
            for (let i = 0; i < interpolationFactor; ++i) {
                const t = i / interpolationFactor;
                keyframes.push([
                    ka,
                    this.rank(name => (a.get(name) || 0) * (1 - t) + (b.get(name) || 0) * t)
                ]);
            }
        }
        keyframes.push([kb, this.rank(name => b.get(name) || 0)]);

        this.keyframes = keyframes;

        this.nameframes = d3.groups(
            keyframes.flatMap(([, renamed]) => renamed),
            d => d.name
        );

        this.prev = new Map(
            this.nameframes.flatMap(([, renamed]) =>
                d3.pairs(renamed, (a, b) => [b, a])
            )
        );

        this.next = new Map(
            this.nameframes.flatMap(([, renamed]) =>
                d3.pairs(renamed)
            )
        );
    }

    createTickers() {
        const now = this.svg.append("text")
            .style("font", `bold ${this.barSize}px "Jetbrains Mono"`)
            .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")
            .attr("x", this.width - 6)
            .attr("y",  this.barSize * (this.k - 0.45))
            .attr("dy", "0.32em")
            .text(this.keyframes[0][0]);

        return ([date], transition) => {
            transition.end().then(() => now.text(date));
        };
    }

    createTextInterpolation(a, b) {
        const i = d3.interpolateNumber(a, b);
        return function (t) {
            this.textContent = i(t).toFixed(2);
        }
    }

    createLabels() {
        let label = this.svg.append("g")
            .style("font", `bold 12px "Jetbrains Mono"`)
            .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")
            .selectAll("text");

        return ([date, data], transition) => label = label
            .data(data.slice(0, this.k), d => d.name)
            .join(
                enter => enter.append("text")
                    .attr("transform", d => `translate(${this.x((this.prev.get(d) || d).value)},${this.y((this.prev.get(d) || d).rank)})`)
                    .attr("y", this.y.bandwidth() / 2)
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
                    .attr("transform", d => `translate(${this.x((this.next.get(d) || d).value)},${this.y((this.next.get(d) || d).rank)})`)
                    .call(g => g.select("tspan").tween("text", d => this.createTextInterpolation(d.value, (this.next.get(d) || d).value)))
            )
            .call(bar => bar.transition(transition)
                .attr("transform", d => `translate(${this.x(d.value)},${this.y(d.rank)})`)
                .call(g => g.select("tspan").tween("text", d => this.createTextInterpolation((this.prev.get(d) || d).value, d.value))));
    }

    createBars() {
        let bar = this.svg.append("g")
            .attr("fill-opacity", 0.6)
            .selectAll("rect");

        return ([_, data], transition) => {
            return bar = bar
                .data(data.slice(0, this.k), d => d.name)
                .join(
                    enter => enter.append("rect")
                        .attr("fill", d => this.colors[d.name])
                        .attr("height", this.y.bandwidth())
                        .attr("x", this.x(0))
                        .attr("y", d => this.y((this.prev.get(d) || d).rank))
                        .attr("width", d => this.x((this.prev.get(d) || d).value) - this.x(0)),
                    update => update,
                    exit => exit.transition(transition).remove()
                        .attr("y", d => this.y((this.next.get(d) || d).rank))
                        .attr("width", d => this.x((this.next.get(d) || d).value) - this.x(0))
                )
                .call(bar => bar.transition(transition)
                    .attr("y", d => this.y(d.rank))
                    .attr("width", d => this.x(d.value) - this.x(0)));
        }
    }

    async play(onFrame) {
        const updateAxis = this.createBars();
        const updateLabels = this.createLabels();
        const updateTicker = this.createTickers();

        for (const keyframe of this.keyframes) {
            const transition = this.svg.transition()
                .duration(500)
                .ease(d3.easeLinear);

            this.x.domain([0, keyframe[1][0].value]);

            [updateAxis, updateLabels, updateTicker].forEach(func => func(keyframe, transition));

            await transition.end();

            onFrame(keyframe);
        }
    }
}