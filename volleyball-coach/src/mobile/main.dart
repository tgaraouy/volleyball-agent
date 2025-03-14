import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';

void main() => runApp(VolleyballCoachApp());

class VolleyballCoachApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Volleyball Coach',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: VolleyballCoachScreen(),
    );
  }
}

class VolleyballCoachScreen extends StatefulWidget {
  @override
  _VolleyballCoachScreenState createState() => _VolleyballCoachScreenState();
}

class _VolleyballCoachScreenState extends State<VolleyballCoachScreen> {
  Map<String, String> latestAnalysis = {
    'technique': 'No data yet',
    'positioning': 'No data yet',
    'tactics': 'No data yet'
  };
  Map<String, dynamic> stats = {
    'team_stats': {
      'attack_attempts': 0,
      'kills': 0,
      'errors': 0,
      'blocks': 0,
      'digs': 0,
      'aces': 0,
    },
    'efficiency': '0.000',
    'player_count': 0,
    'total_points': 0
  };
  
  Timer? _timer;
  String serverAddress = 'http://localhost:5000';
  bool isConnected = false;
  
  TextEditingController serverController = TextEditingController();
  
  @override
  void initState() {
    super.initState();
    serverController.text = serverAddress;
    _startPolling();
  }
  
  void _startPolling() {
    _timer?.cancel();
    _timer = Timer.periodic(Duration(seconds: 1), (timer) {
      fetchAnalysis();
      fetchStats();
    });
  }
  
  @override
  void dispose() {
    _timer?.cancel();
    serverController.dispose();
    super.dispose();
  }
  
  Future<void> fetchAnalysis() async {
    try {
      final response = await http.get(Uri.parse('$serverAddress/analysis'))
          .timeout(Duration(seconds: 2));
      
      if (response.statusCode == 200) {
        Map<String, dynamic> data = json.decode(response.body);
        
        setState(() {
          isConnected = true;
          for (var key in data.keys) {
            if (data[key] != null && data[key]['result'] != null) {
              latestAnalysis[key] = data[key]['result'];
            }
          }
        });
      }
    } catch (e) {
      setState(() {
        isConnected = false;
      });
      print('Error fetching analysis: $e');
    }
  }
  
  Future<void> fetchStats() async {
    try {
      final response = await http.get(Uri.parse('$serverAddress/stats'))
          .timeout(Duration(seconds: 2));
      
      if (response.statusCode == 200) {
        Map<String, dynamic> data = json.decode(response.body);
        
        setState(() {
          isConnected = true;
          stats = data;
        });
      }
    } catch (e) {
      setState(() {
        isConnected = false;
      });
      print('Error fetching stats: $e');
    }
  }
  
  void _updateServerAddress() {
    setState(() {
      serverAddress = serverController.text;
      _startPolling();
    });
    Navigator.pop(context);
  }
  
  void _showServerDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Server Configuration'),
          content: TextField(
            controller: serverController,
            decoration: InputDecoration(
              labelText: 'Server Address',
              hintText: 'http://server-ip:5000'
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('CANCEL'),
            ),
            TextButton(
              onPressed: _updateServerAddress,
              child: Text('SAVE'),
            ),
          ],
        );
      }
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Volleyball Coach'),
        actions: [
          IconButton(
            icon: Icon(Icons.settings),
            onPressed: _showServerDialog,
          ),
        ],
      ),
      body: Column(
        children: [
          // Connection status
          Container(
            color: isConnected ? Colors.green[100] : Colors.red[100],
            padding: EdgeInsets.symmetric(vertical: 8.0, horizontal: 16.0),
            child: Row(
              children: [
                Icon(
                  isConnected ? Icons.check_circle : Icons.error,
                  color: isConnected ? Colors.green[700] : Colors.red[700],
                ),
                SizedBox(width: 8.0),
                Text(
                  isConnected 
                      ? 'Connected to server' 
                      : 'Not connected to server',
                  style: TextStyle(
                    color: isConnected ? Colors.green[700] : Colors.red[700],
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          
          // Video feed
          Expanded(
            flex: 3,
            child: Container(
              margin: EdgeInsets.all(8.0),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(8.0),
              ),
              child: isConnected
                  ? Image.network(
                      '$serverAddress/video_feed',
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) {
                        return Center(child: Text('Video feed unavailable'));
                      },
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Center(
                          child: CircularProgressIndicator(
                            value: loadingProgress.expectedTotalBytes != null
                                ? loadingProgress.cumulativeBytesLoaded / 
                                    loadingProgress.expectedTotalBytes!
                                : null,
                          ),
                        );
                      },
                    )
                  : Center(
                      child: Text('Not connected to server'),
                    ),
            ),
          ),
          
          // Stats summary
          Container(
            margin: EdgeInsets.all(8.0),
            padding: EdgeInsets.all(8.0),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(8.0),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem('Kills', stats['team_stats']['kills'].toString()),
                _buildStatItem('Blocks', stats['team_stats']['blocks'].toString()),
                _buildStatItem('Aces', stats['team_stats']['aces'].toString()),
                _buildStatItem('Efficiency', stats['efficiency']),
              ],
            ),
          ),
          
          // Analysis cards
          Expanded(
            flex: 2,
            child: ListView(
              padding: EdgeInsets.all(8.0),
              children: [
                AnalysisCard(
                  title: 'Technique',
                  content: latestAnalysis['technique'] ?? 'No data',
                  color: Colors.blue[100]!,
                ),
                AnalysisCard(
                  title: 'Positioning',
                  content: latestAnalysis['positioning'] ?? 'No data',
                  color: Colors.green[100]!,
                ),
                AnalysisCard(
                  title: 'Tactics',
                  content: latestAnalysis['tactics'] ?? 'No data',
                  color: Colors.orange[100]!,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 20.0,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12.0,
          ),
        ),
      ],
    );
  }
}

class AnalysisCard extends StatelessWidget {
  final String title;
  final String content;
  final Color color;
  
  AnalysisCard({required this.title, required this.content, required this.color});
  
  @override
  Widget build(BuildContext context) {
    return Card(
      color: color,
      margin: EdgeInsets.only(bottom: 8.0),
      child: Padding(
        padding: EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18.0,
              ),
            ),
            SizedBox(height: 8.0),
            Text(content),
          ],
        ),
      ),
    );
  }
} 