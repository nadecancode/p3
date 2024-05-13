<script>
    import Chart from '$lib/chart.js';
    import * as d3 from 'd3';

    import { onMount } from 'svelte';

    let ready = false;

    let data = [];
    let groupedCountryDates;

    const MONITORING_FIELDS = {
        "oil_production": {
            name: "Oil Production",
            unit: "Terawatt-Hours"
        },
        "gas_production": {
            name: "Gas Production",
            unit: "Terawatt-Hours"
        },
        "coal_production": {
            name: "Coal Production",
            unit: "Terawatt-Hours"
        },
        "electricity_generation": {
            name: "Electricity Generation",
            unit: "Terawatt-Hours"
        },
        "gdp": {
            name: "GDP",
            unit: "Billion US Dollars",
            func: d => d / 1000000000
        },
        "population": {
            name: "Population",
            unit: "Million People",
            func: d => d / 1000000
        }
    }

    onMount(async () => {
       const res = await (await fetch("owid-energy-data.json")).json();

       Object.keys(res).forEach(country => {
           if (!res[country]["iso_code"]) return;

            const d = res[country].data;

            for (let datum of d) {
                const values = {};

                for (let [k, v] of Object.entries(MONITORING_FIELDS)) {
                    values[k] = datum[k];
                    if (v["func"]) values[k] = v.func(values[k]);
                }

                data.push({
                    name: country,
                    ...values,
                    year: datum.year
                })
            }
       });

       const dates = await (await fetch("dates.json")).json();

       groupedCountryDates = d3.group(dates, d => d.Country, d => d.Year);
       ready = true;
    });

    let start = 2000;
    let end = 2022;
    let n = 5;
    let chart = undefined;
    let tops = undefined;

    let tempStart = start;
    let tempEnd = end;
    let tempN = n;
    let tempSelected;
    let selected;
    let year;

    $: {
        if (data?.length > 0 && !!selected) {
            const filtered = data.filter(item => item.year >= start && item.year <= end);

            filtered.forEach(d => {
                d.value = d[selected];
            });

            if (chart) {
                chart.erase();
            }

            chart = new Chart(window.screen.width / 2, n);

            chart.populate(filtered);
            chart.outlineFrames();
            chart.animateFrames(frame => {
                tops = frame[1].splice(0, n).map(f => f.name);
                year = frame[0];
            });
        }
    }

    function playChart() {
        start = tempStart;
        end = tempEnd;
        n = tempN;
        selected = tempSelected;
    }
</script>

<div>
    <h1>Top {n} Countries with {selected ? MONITORING_FIELDS[selected].name : "TBD"} from {start} to {end}</h1>
    <h2>({selected ? `in ${MONITORING_FIELDS[selected].unit}` : "Unit TBD"})</h2>
    <label for="n">
        I want to see animation for top
        <input id="n" type="number" min="1" max="50" bind:value={tempN}/>
        countries
    </label>

    <label for="range">
        from year
        <input type="number" min="1900" bind:value={tempStart}/>
        to
        <input type="number" min={tempEnd} max="2022" bind:value={tempEnd}/>
    </label>

    <label for="field">
        with most
        <select id="field" bind:value={tempSelected}>
            <option disabled selected value>Choose one</option>
            {#each [...Object.entries(MONITORING_FIELDS)] as [key, value]}
                <option value={key}>{value.name}</option>
            {/each}
        </select>
    </label>
    <button disabled={!ready} on:click={() => playChart()}>{ready ? "Start" : "Loading Data"}</button>
    <h1>Lead: {tops ? tops[0] ?? "TBD" : "TBD"}</h1>
    <div class="container">
        <div id="chart">
            <svg></svg>
        </div>
        <div id="events">
            <h2>Important Historical Events:</h2>
            {#if Array.isArray(tops)}
                {#each tops as top}
                    {#if groupedCountryDates && groupedCountryDates.has(top) && groupedCountryDates.get(top).has(String(year))}
                        <h3>{top}</h3>
                        <ul>
                            {#each groupedCountryDates.get(top).get(String(year)) as value}
                                <li>{value["Name of Incident"].replace("Unknown", "-")}</li>
                            {/each}
                        </ul>
                    {/if}
                {/each}
            {/if}
        </div>
    </div>
</div>

<style>
    * {
        font-family: "JetBrains Mono", serif;
    }

    .container {
        min-width: 100%;
    }

    #events {
        display: table-cell;
        min-width: 40vw;
        vertical-align: top;
        margin-left: 10vw;
    }

    #chart {
        display: table-cell;
        white-space: nowrap;
        min-width: 50vw;
    }
</style>