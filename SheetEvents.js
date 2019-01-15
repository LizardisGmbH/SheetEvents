define([
  "underscore",
  "qlik",
  "core.utils/deferred",
  "./properties",
  "./initialproperties"
], function ( _, qlik, Deferred, props, initProps ) {
    "use strict";

  return {
    definition: props,
    support: {
      export: false,
      exportData: false,
      snapshot: false
    },
    initialProperties: initProps,
    snapshot: {canTakeSnapshot: false},

    controller: ["$scope", "$element", function ( $scope, $element ) {
      /* Global variable definition */
      var qlikApp, delay;
      var tasksArray= [];
      var tasksArrayIndex= 0;

      window.scope = $scope;

      // Helper function to retrieve a field
      function getField( fieldName ) {
        if ( !_.isEmpty( fieldName ) ) {
          return qlikApp.field( fieldName );
        } else {
          return undefined;
        }
      }

      // Helper function to convert string-values to selectable Qlik Sense values
      function convertToqTextObjects(entry){
        return {qText: entry};
      }

      function resolveTasks( atIndex ) {
        if( atIndex < tasksArrayIndex && _.isFunction( tasksArray[atIndex] ) ) {

          tasksArray[atIndex]().then(function() {
            atIndex += 1;
            resolveTasks(atIndex);
          });

        }
      }

      return {
        onInit: function() {
          qlikApp = qlik.currApp();
          delay = $scope.layout.props["delay"];

          var i, fieldName, field, value, values, valueArray, softlock, variable, bookmark;
                      
          for (i = 1; i <= 10; i+=1 ) {
            tasksArrayIndex= i - 1;
            fieldName       = $scope.layout.props["field" + i];
            field           = getField( fieldName );
            value           = $scope.layout.props["value" + i];
            valueArray      = $scope.layout.props["value" + i].split(";");
            values          = valueArray.map( convertToqTextObjects );
            softlock = $scope.layout.props["softlock" + i];
            variable        = $scope.layout.props["variable" + i];
            bookmark        = $scope.layout.props["bookmark" + i];
                          
            switch ( $scope.layout.props["actionBefore" + i] ) {
              case "clearAll":
                tasksArray[i - 1] = qlikApp.clearAll.bind(qlikApp);
                break;
              case "lockAll":
                tasksArray[i - 1] = qlikApp.lockAll.bind(qlikApp);
                break;
              case "unlockAll":
                tasksArray[i - 1] = qlikApp.unlockAll.bind(qlikApp);
                break;
              case "clearField":
                tasksArray[i - 1] = field.clear.bind(field);
                break;
              case "selectAlternative":
                tasksArray[i - 1] = field.selectAlternative.bind(field, softlock);
                break;
              case "selectExcluded":
                tasksArray[i - 1] = field.selectExcluded.bind(field, softlock);
                break;
              case "selectPossible":
                tasksArray[i - 1] = field.selectPossible.bind( field, softlock );
                break;
              case "selectField":
                if ( !_.isEmpty( value ) ) {
                  tasksArray[i - 1] = field.selectMatch.bind(field, value, true);
                }
                break;
              case "selectValues":
                if ( !_.isEmpty( valueArray ) ) {
                  tasksArray[i - 1] = field.selectValues.bind(field, values, true);
                }
                break;
              case "selectandLockField":
                if ( !_.isEmpty( value ) ) {
                  tasksArray[i - 1] = function() {
                    field.selectMatch( value );
                    return qlikApp.field( fieldName ).lock();
                  };
                }
                break;
              case "lockField":
                tasksArray[i - 1] = field.selectMatch.lock( field );
                break;
              case "applyBookmark":
                if ( !_.isEmpty( bookmark ) ) {
                  tasksArray[i - 1] = qlikApp.bookmark.apply.bind( qlikApp.bookmark, bookmark );
                }
                break;
              case "setVariable":
                if ( !_.isEmpty( variable ) ) {
                  tasksArray[i - 1] = qlikApp.variable.setStringValue.bind( qlikApp.variable, variable, value );
                }
                break;
              case "none":
                i = 10;
                break;
              default:
                i = 10;
            }
          }

          _.delay(function() {
            resolveTasks( 0 );
          }, delay );

          return Deferred.resolve();
        }
      };
    }]
  };
});