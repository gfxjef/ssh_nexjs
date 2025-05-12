import os
import json
from kafka.producer import KafkaProducer
from kafka.consumer import KafkaConsumer
from threading import Thread
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
KAFKA_TOPIC = os.environ.get('KAFKA_TOPIC', 'app_events')

class KafkaClient:
    """Kafka client for producing and consuming messages"""
    
    def __init__(self):
        self.producer = None
        self.consumer = None
        self.consumer_thread = None
        self.running = False
    
    def init_producer(self):
        """Initialize Kafka producer"""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None
            )
            logger.info("Kafka producer initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Kafka producer: {str(e)}")
            return False
    
    def send_message(self, message, key=None):
        """Send message to Kafka topic"""
        if not self.producer:
            if not self.init_producer():
                logger.error("Cannot send message: producer not initialized")
                return False
        
        try:
            future = self.producer.send(KAFKA_TOPIC, key=key, value=message)
            result = future.get(timeout=10)
            logger.info(f"Message sent successfully: {result}")
            return True
        except Exception as e:
            logger.error(f"Failed to send message: {str(e)}")
            return False
    
    def init_consumer(self, group_id='app_consumer_group'):
        """Initialize Kafka consumer"""
        try:
            self.consumer = KafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                auto_offset_reset='earliest',
                enable_auto_commit=True,
                group_id=group_id,
                value_deserializer=lambda x: json.loads(x.decode('utf-8'))
            )
            logger.info("Kafka consumer initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Kafka consumer: {str(e)}")
            return False
    
    def start_consumer(self, message_handler):
        """Start consumer in a separate thread"""
        if not self.consumer:
            if not self.init_consumer():
                logger.error("Cannot start consumer: consumer not initialized")
                return False
        
        self.running = True
        self.consumer_thread = Thread(target=self._consume_messages, args=(message_handler,))
        self.consumer_thread.daemon = True
        self.consumer_thread.start()
        logger.info("Kafka consumer thread started")
        return True
    
    def _consume_messages(self, message_handler):
        """Consume messages from Kafka topic"""
        try:
            for message in self.consumer:
                if not self.running:
                    break
                
                logger.info(f"Received message: {message.value}")
                try:
                    message_handler(message.value)
                except Exception as e:
                    logger.error(f"Error processing message: {str(e)}")
        except Exception as e:
            logger.error(f"Consumer error: {str(e)}")
    
    def stop_consumer(self):
        """Stop the consumer thread"""
        self.running = False
        if self.consumer:
            self.consumer.close()
            logger.info("Kafka consumer closed")
        
        if self.consumer_thread and self.consumer_thread.is_alive():
            self.consumer_thread.join(timeout=5)
            logger.info("Kafka consumer thread stopped")
    
    def close(self):
        """Close Kafka connections"""
        self.stop_consumer()
        
        if self.producer:
            self.producer.close()
            logger.info("Kafka producer closed")

# Example usage
def handle_message(message):
    """Example message handler"""
    print(f"Processing message: {message}")
    # Add your message processing logic here

# For testing
if __name__ == "__main__":
    # Create client
    kafka_client = KafkaClient()
    
    # Start consumer
    kafka_client.start_consumer(handle_message)
    
    # Send a test message
    kafka_client.send_message({"event": "test", "data": {"key": "value"}})
    
    # Keep running for a while to see messages
    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        kafka_client.close()
