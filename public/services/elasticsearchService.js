export default class ElasticsearchService {

  constructor($http) {
    this.$http = $http;
  }

  isElasticsearch54() {
    return this.$http.get('../elasticsearch').then(res => {
      this.isElasticsearch54 = res.data.version.number.indexOf('5.4') === 0;
      return this.isElasticsearch54;
    });
  }

  searchAllSpansFor(traceId) {
    return this.searchSpans({
      'stored_fields': ['*'],
      'query': {
        'term': {
          'trace_id': traceId
        }
      },
      '_source': {
        'excludes': ['call_tree_ascii']
      },
      'size': 10000
    });
  }

  searchSpans(searchObject) {
    return this.$http.post('../api/stagemonitor-kibana-6/search/es/stagemonitor-spans-*', searchObject);
  }

  updateTracingVisualizationUrlScriptedField() {
    // ../elasticsearch/.kibana/doc/_search
    this.$http.post('../api/stagemonitor-kibana-6/search/es/.kibana', {
      'query': {
        'match': {
          '_id': 'index-pattern:stagemonitor-spans-*'
        }
      }
    }).then(res => {
      const hit = res.data.hits.hits[0];
      const indexPattern = hit._source['index-pattern'];
      const fields = JSON.parse(indexPattern.fields);
      const tracingVisualization = {
        aggregatable: true,
        analyzed: false,
        count: 0,
        doc_values: false,
        indexed: false,
        lang: 'painless',
        name: 'trace_visualization',
        script: 'doc[\'trace_id\'].value',
        scripted: true,
        searchable: false,
        type: 'string'
      };

      if (_.some(fields, _.matchesProperty('name', 'trace_visualization'))) {
        // remove if already exists so that we always get the up-to-date mapping definition
        _.remove(fields, _.matchesProperty('name', 'trace_visualization'));
      }
      fields.push(tracingVisualization);
      indexPattern.fields = JSON.stringify(fields);

      const fieldFormatMap = JSON.parse(indexPattern.fieldFormatMap || '{}');
      fieldFormatMap.trace_visualization = {
        id: 'url',
        params: {
          'labelTemplate': 'Trace Visualization',
          'urlTemplate': '../app/stagemonitor-kibana#/trace/{{value}}'
        }
      };
      indexPattern.fieldFormatMap = JSON.stringify(fieldFormatMap);

      // ../elasticsearch/.kibana/*/
      //this.$http.post('../api/stagemonitor-kibana-6/update/es/' + hit._id, { doc: indexPattern });
    });
  }

}
